require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { ensureWalletAccount } = require('../services/ledgerService');

function readBootstrapConfig(environment = process.env) {
  const email = String(environment.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = String(environment.ADMIN_BOOTSTRAP_PASSWORD || '');
  const name = String(environment.ADMIN_BOOTSTRAP_NAME || 'System Administrator').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain at least 12 characters.');
  }
  if (!name) {
    throw new Error('ADMIN_BOOTSTRAP_NAME cannot be empty.');
  }

  return { email, password, name };
}

async function createAdminAccount(environment = process.env) {
  const { email, password, name } = readBootstrapConfig(environment);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if user exists
    const existing = await client.query('SELECT userid FROM users WHERE email = $1', [email]);
    let userId;
    
    if (existing.rowCount) {
      userId = existing.rows[0].userid;
      await client.query(
        `UPDATE users 
         SET passwordhash = $2, role = 'admin', email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP), failed_login_attempts = 0, locked_until = NULL 
         WHERE userid = $1`,
        [userId, hashedPassword]
      );
      console.log(`Updated existing account ${email} to admin role with new password.`);
    } else {
      const userResult = await client.query(
        `INSERT INTO users(name, email, passwordhash, role, email_verified_at)
         VALUES ($1, $2, $3, 'admin', CURRENT_TIMESTAMP)
         RETURNING userid`,
        [name, email, hashedPassword]
      );
      userId = userResult.rows[0].userid;
      
      const walletResult = await client.query(
        `INSERT INTO wallet(userid, balance, currency)
         VALUES ($1, 0, 'USD') RETURNING walletid, currency`,
        [userId]
      );
      await ensureWalletAccount(client, walletResult.rows[0]);
      await client.query(
        `INSERT INTO wallet_members(walletid, userid, role) VALUES ($1, $2, 'owner')
         ON CONFLICT (walletid, userid) DO NOTHING`,
        [walletResult.rows[0].walletid, userId]
      );
      await client.query(
        'INSERT INTO notification_preferences(userid) VALUES ($1) ON CONFLICT DO NOTHING',
        [userId]
      );
      console.log(`Created new Admin account ${email}.`);
    }

    await client.query(
      `INSERT INTO audit_logs(action, resource_type, resource_id, metadata)
       VALUES ('admin.bootstrap_account', 'user', $1, $2)`,
      [String(userId), { email, role: 'admin' }]
    );
    
    await client.query('COMMIT');
    console.log(`Admin bootstrap completed for ${email}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  createAdminAccount().catch((error) => {
    console.error('Error creating admin account:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  createAdminAccount,
  readBootstrapConfig,
};
