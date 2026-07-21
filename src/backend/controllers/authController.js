const bcrypt = require('bcryptjs');
const pool = require('../db');
const {
  consumeActionToken,
  createActionToken,
  createSession,
  publicUser,
  revokeSession,
  rotateSession,
} = require('../services/authService');
const { writeAudit } = require('../services/auditService');
const { developmentToken, queueEmail } = require('../services/emailService');
const { ensureWalletAccount } = require('../services/ledgerService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const context = (req) => ({
  userAgent: req.get('user-agent')?.slice(0, 255),
  ipAddress: req.ip,
});

async function registerUser(req, res, next) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  if (!name || !emailPattern.test(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'A valid name, email, and password are required' });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must contain at least 10 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users(name, email, passwordhash)
       VALUES ($1, $2, $3)
       RETURNING userid, name, email, role, email_verified_at`,
      [name, email, hashedPassword]
    );
    const user = userResult.rows[0];
    const walletResult = await client.query(
      `INSERT INTO wallet(userid, balance, currency)
       VALUES ($1, 0, 'USD') RETURNING walletid, currency`,
      [user.userid]
    );
    await ensureWalletAccount(client, walletResult.rows[0]);
    await client.query(
      'INSERT INTO notification_preferences(userid) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.userid]
    );

    const verificationToken = await createActionToken(client, user.userid, 'verify_email', 1440);
    await queueEmail(client, {
      userId: user.userid,
      recipient: user.email,
      template: 'verify_email',
      payload: { token: verificationToken },
    });
    await writeAudit(client, {
      actorUserId: user.userid,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: String(user.userid),
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Account created. Verify your email to secure the account.',
      user: publicUser(user),
      verificationToken: developmentToken(verificationToken),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(error);
  } finally {
    client.release();
  }
}

async function loginUser(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = req.body.password;
  if (!emailPattern.test(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT userid, name, email, passwordhash, role, email_verified_at,
              failed_login_attempts, locked_until
       FROM users WHERE email = $1 FOR UPDATE`,
      [email]
    );
    const user = result.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await client.query('ROLLBACK');
      return res.status(423).json({ error: 'Account temporarily locked after repeated login failures' });
    }

    const matches = await bcrypt.compare(password, user.passwordhash);
    if (!matches) {
      const failures = Number(user.failed_login_attempts) + 1;
      await client.query(
        `UPDATE users
         SET failed_login_attempts = $2,
             locked_until = CASE WHEN $2 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE NULL END
         WHERE userid = $1`,
        [user.userid, failures]
      );
      await writeAudit(client, {
        actorUserId: user.userid,
        action: 'auth.login_failed',
        resourceType: 'user',
        resourceId: String(user.userid),
        metadata: { failures },
        ipAddress: req.ip,
      });
      await client.query('COMMIT');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.email_verified_at) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Verify your email before signing in' });
    }

    await client.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE userid = $1',
      [user.userid]
    );
    const session = await createSession(client, user, context(req));
    await writeAudit(client, {
      actorUserId: user.userid,
      action: 'auth.login',
      resourceType: 'session',
      resourceId: session.refreshTokenId,
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({ ...session, user: publicUser(user) });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function refreshSession(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const session = await rotateSession(client, req.body.refreshToken, context(req));
    if (!session) {
      await client.query('COMMIT');
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    await writeAudit(client, {
      actorUserId: session.user.id,
      action: 'auth.refresh',
      resourceType: 'session',
      resourceId: session.refreshTokenId,
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json(session);
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function logoutUser(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await revokeSession(client, req.body.refreshToken);
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'auth.logout',
      resourceType: 'session',
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function verifyEmail(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await consumeActionToken(client, req.body.token, 'verify_email');
    if (!userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    await client.query(
      'UPDATE users SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP) WHERE userid = $1',
      [userId]
    );
    await writeAudit(client, {
      actorUserId: userId,
      action: 'auth.email_verified',
      resourceType: 'user',
      resourceId: String(userId),
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function forgotPassword(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT userid, email FROM users WHERE email = $1', [email]);
    let resetToken;
    if (result.rowCount) {
      const user = result.rows[0];
      resetToken = await createActionToken(client, user.userid, 'reset_password', 30);
      await queueEmail(client, {
        userId: user.userid,
        recipient: user.email,
        template: 'reset_password',
        payload: { token: resetToken },
      });
    }
    await client.query('COMMIT');
    return res.status(202).json({
      message: 'If that account exists, password reset instructions were queued.',
      resetToken: developmentToken(resetToken),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function resendVerification(req, res, next) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT userid, email, email_verified_at FROM users WHERE email = $1',
      [email]
    );
    let verificationToken;
    if (result.rowCount && !result.rows[0].email_verified_at) {
      const user = result.rows[0];
      verificationToken = await createActionToken(client, user.userid, 'verify_email', 1440);
      await queueEmail(client, {
        userId: user.userid,
        recipient: user.email,
        template: 'verify_email',
        payload: { token: verificationToken },
      });
    }
    await client.query('COMMIT');
    return res.status(202).json({
      message: 'If that unverified account exists, a new verification email was queued.',
      verificationToken: developmentToken(verificationToken),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function resetPassword(req, res, next) {
  const password = req.body.password;
  if (typeof password !== 'string' || password.length < 10) {
    return res.status(400).json({ error: 'Password must contain at least 10 characters' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = await consumeActionToken(client, req.body.token, 'reset_password');
    if (!userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    await client.query(
      'UPDATE users SET passwordhash = $2, failed_login_attempts = 0, locked_until = NULL WHERE userid = $1',
      [userId, await bcrypt.hash(password, 12)]
    );
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE userid = $1',
      [userId]
    );
    await writeAudit(client, {
      actorUserId: userId,
      action: 'auth.password_reset',
      resourceType: 'user',
      resourceId: String(userId),
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({ message: 'Password reset successfully. Sign in again.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  verifyEmail,
  forgotPassword,
  resendVerification,
  resetPassword,
};
