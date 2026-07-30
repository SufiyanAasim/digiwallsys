const bcrypt = require('bcryptjs');
const pool = require('../db');
const { createActionToken, publicUser } = require('../services/authService');
const { writeAudit } = require('../services/auditService');
const { developmentToken, queueEmail } = require('../services/emailService');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getCurrentUser(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT userid, name, email, role, email_verified_at
       FROM users WHERE userid = $1`,
      [req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    return res.json(publicUser(result.rows[0]));
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT userid, name FROM users
       WHERE userid <> $1 AND email_verified_at IS NOT NULL
       ORDER BY name LIMIT 200`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const currentPassword = req.body.currentPassword;

  if (name.length < 2 || name.length > 120 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid name and email address' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT userid, name, email, passwordhash, role, email_verified_at
       FROM users WHERE userid = $1 FOR UPDATE`,
      [req.user.userId]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const emailChanged = email !== current.email;
    const nameChanged = name !== current.name;
    if (!emailChanged && !nameChanged) {
      await client.query('ROLLBACK');
      return res.json({
        message: 'Profile is already up to date',
        user: publicUser(current),
      });
    }

    if (
      emailChanged
      && (
        typeof currentPassword !== 'string'
        || !(await bcrypt.compare(currentPassword, current.passwordhash))
      )
    ) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Current password is required to change email' });
    }

    const updateResult = await client.query(
      `UPDATE users
       SET name = $2,
           email = $3,
           email_verified_at = CASE WHEN $4 THEN NULL ELSE email_verified_at END
       WHERE userid = $1
       RETURNING userid, name, email, role, email_verified_at`,
      [current.userid, name, email, emailChanged]
    );

    let verificationToken;
    if (emailChanged) {
      await client.query(
        `UPDATE action_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
         WHERE userid = $1 AND purpose = 'verify_email' AND used_at IS NULL`,
        [current.userid]
      );
      verificationToken = await createActionToken(client, current.userid, 'verify_email', 1440);
      await queueEmail(client, {
        userId: current.userid,
        recipient: email,
        template: 'verify_email',
        payload: { token: verificationToken },
      });
    }

    await writeAudit(client, {
      actorUserId: current.userid,
      action: 'user.profile_updated',
      resourceType: 'user',
      resourceId: String(current.userid),
      metadata: { nameChanged, emailChanged },
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({
      message: emailChanged
        ? 'Profile updated. Verify the new email before your next sign-in.'
        : 'Profile updated successfully',
      user: publicUser(updateResult.rows[0]),
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

async function changePassword(req, res, next) {
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  if (newPassword.length < 10) {
    return res.status(400).json({ error: 'New password must contain at least 10 characters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT userid, passwordhash FROM users WHERE userid = $1 FOR UPDATE',
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordhash))) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    if (await bcrypt.compare(newPassword, user.passwordhash)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    await client.query(
      `UPDATE users
       SET passwordhash = $2, failed_login_attempts = 0, locked_until = NULL
       WHERE userid = $1`,
      [user.userid, await bcrypt.hash(newPassword, 12)]
    );
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
       WHERE userid = $1`,
      [user.userid]
    );
    await writeAudit(client, {
      actorUserId: user.userid,
      action: 'auth.password_changed',
      resourceType: 'user',
      resourceId: String(user.userid),
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({ message: 'Password changed. Sign in again on every device.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  getCurrentUser,
  listUsers,
  updateProfile,
  changePassword,
};
