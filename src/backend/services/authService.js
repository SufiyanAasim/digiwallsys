const jwt = require('jsonwebtoken');
const { hashToken, randomToken } = require('../utils/crypto');

const accessMinutes = Number(process.env.ACCESS_TOKEN_MINUTES || 15);
const refreshDays = Number(process.env.REFRESH_TOKEN_DAYS || 30);

function signAccessToken(user) {
  return jwt.sign(
    { userId: user.userid, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: `${accessMinutes}m`, issuer: 'digiwallsys', audience: 'digiwallsys-mobile' }
  );
}

async function createSession(client, user, context = {}) {
  const refreshToken = randomToken();
  const tokenHash = hashToken(refreshToken);
  const result = await client.query(
    `INSERT INTO refresh_tokens
       (userid, tokenhash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 day'), $4, $5)
     RETURNING tokenid`,
    [user.userid, tokenHash, refreshDays, context.userAgent || null, context.ipAddress || null]
  );

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    refreshTokenId: result.rows[0].tokenid,
    expiresInSeconds: accessMinutes * 60,
  };
}

async function rotateSession(client, suppliedToken, context = {}) {
  const tokenHash = hashToken(suppliedToken || '');
  const result = await client.query(
    `SELECT rt.*, u.userid, u.name, u.email, u.role, u.email_verified_at
     FROM refresh_tokens rt
     JOIN users u ON u.userid = rt.userid
     WHERE rt.tokenhash = $1
     FOR UPDATE OF rt`,
    [tokenHash]
  );

  if (!result.rowCount) return null;
  const oldToken = result.rows[0];

  if (oldToken.revoked_at) {
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE userid = $1',
      [oldToken.userid]
    );
    return null;
  }
  if (new Date(oldToken.expires_at) <= new Date()) return null;

  const session = await createSession(client, oldToken, context);
  await client.query(
    'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, replaced_by = $1 WHERE tokenid = $2',
    [session.refreshTokenId, oldToken.tokenid]
  );

  return {
    ...session,
    user: publicUser(oldToken),
  };
}

async function revokeSession(client, suppliedToken) {
  if (!suppliedToken) return;
  await client.query(
    'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP) WHERE tokenhash = $1',
    [hashToken(suppliedToken)]
  );
}

async function createActionToken(client, userId, purpose, lifetimeMinutes) {
  const token = randomToken();
  await client.query(
    `INSERT INTO action_tokens(userid, purpose, tokenhash, expires_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + ($4 * INTERVAL '1 minute'))`,
    [userId, purpose, hashToken(token), lifetimeMinutes]
  );
  return token;
}

async function consumeActionToken(client, token, purpose) {
  const result = await client.query(
    `UPDATE action_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE tokenhash = $1 AND purpose = $2 AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     RETURNING userid`,
    [hashToken(token || ''), purpose]
  );
  return result.rows[0]?.userid || null;
}

function publicUser(user) {
  return {
    id: user.userid,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: Boolean(user.email_verified_at),
  };
}

module.exports = {
  createSession,
  rotateSession,
  revokeSession,
  createActionToken,
  consumeActionToken,
  publicUser,
};
