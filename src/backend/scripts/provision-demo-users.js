require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { writeAudit } = require('../services/auditService');
const {
  ensureWalletAccount,
  getClearingAccount,
  postJournal,
} = require('../services/ledgerService');
const { createNotification } = require('../services/notificationService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readDemoConfig(environment = process.env) {
  const users = [1, 2].map((number) => {
    const email = String(
      environment[`DEMO_USER_${number}_EMAIL`] || `user${number}@digiwallsys.com`
    ).trim().toLowerCase();
    const password = String(environment[`DEMO_USER_${number}_PASSWORD`] || '');
    const name = String(
      environment[`DEMO_USER_${number}_NAME`] || `digiwallsys User ${number}`
    ).trim();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error(`DEMO_USER_${number}_EMAIL must be a valid email address.`);
    }
    if (password.length < 8) {
      throw new Error(`DEMO_USER_${number}_PASSWORD must contain at least 8 characters.`);
    }
    if (!name) {
      throw new Error(`DEMO_USER_${number}_NAME cannot be empty.`);
    }
    return { email, password, name };
  });

  if (users[0].email === users[1].email) {
    throw new Error('Demo-user email addresses must be different.');
  }
  const openingBalance = Number(environment.DEMO_USER_OPENING_BALANCE || 1000);
  if (!Number.isFinite(openingBalance) || openingBalance < 0 || openingBalance > 10000) {
    throw new Error('DEMO_USER_OPENING_BALANCE must be between 0 and 10000.');
  }
  return { users, openingBalance };
}

async function ensureDemoUser(client, user, openingBalance) {
  const passwordHash = await bcrypt.hash(user.password, 12);
  const existing = await client.query(
    'SELECT userid FROM users WHERE email = $1 FOR UPDATE',
    [user.email]
  );
  let userId;
  if (existing.rowCount) {
    userId = existing.rows[0].userid;
    await client.query(
      `UPDATE users
       SET name = $2, passwordhash = $3, role = 'user',
           email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP),
           failed_login_attempts = 0, locked_until = NULL
       WHERE userid = $1`,
      [userId, user.name, passwordHash]
    );
  } else {
    const inserted = await client.query(
      `INSERT INTO users(name, email, passwordhash, role, email_verified_at)
       VALUES ($1, $2, $3, 'user', CURRENT_TIMESTAMP)
       RETURNING userid`,
      [user.name, user.email, passwordHash]
    );
    userId = inserted.rows[0].userid;
  }

  const wallet = await client.query(
    `INSERT INTO wallet(userid, balance, currency)
     VALUES ($1, 0, 'USD')
     ON CONFLICT (userid, currency) DO UPDATE SET currency = EXCLUDED.currency
     RETURNING walletid, currency`,
    [userId]
  );
  const walletId = wallet.rows[0].walletid;
  await client.query(
    `INSERT INTO wallet_members(walletid, userid, role)
     VALUES ($1, $2, 'owner') ON CONFLICT (walletid, userid) DO NOTHING`,
    [walletId, userId]
  );
  await client.query(
    'INSERT INTO notification_preferences(userid) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId]
  );

  const priorFunding = await client.query(
    `SELECT 1 FROM ledger_journals
     WHERE journal_type = 'funding'
       AND metadata->>'source' = 'demo-bootstrap'
       AND metadata->>'recipient' = $1
     LIMIT 1`,
    [user.email]
  );
  if (openingBalance > 0 && !priorFunding.rowCount) {
    const walletAccount = await ensureWalletAccount(client, wallet.rows[0]);
    const clearingAccount = await getClearingAccount(client, wallet.rows[0].currency);
    const journal = await postJournal(client, {
      journalType: 'funding',
      description: 'Demo account opening funds',
      createdBy: userId,
      metadata: { source: 'demo-bootstrap', recipient: user.email },
      entries: [
        { accountId: clearingAccount, entryType: 'debit', amount: openingBalance },
        { accountId: walletAccount, entryType: 'credit', amount: openingBalance },
      ],
    });
    await client.query(
      'UPDATE wallet SET balance = balance + $1 WHERE walletid = $2',
      [openingBalance, walletId]
    );
    await createNotification(client, {
      userId,
      category: 'money',
      title: 'Demo wallet ready',
      body: `USD ${openingBalance.toFixed(2)} is available for transfer testing.`,
      data: { reference: journal.reference, source: 'demo-bootstrap' },
    });
  }

  await writeAudit(client, {
    actorUserId: userId,
    action: 'demo.account_provisioned',
    resourceType: 'user',
    resourceId: String(userId),
    metadata: { email: user.email, openingBalance },
  });
  return { userId, email: user.email };
}

async function provisionDemoUsers(environment = process.env) {
  const { users, openingBalance } = readDemoConfig(environment);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const provisioned = [];
    for (const user of users) {
      provisioned.push(await ensureDemoUser(client, user, openingBalance));
    }
    await client.query('COMMIT');
    console.log(`Provisioned ${provisioned.length} verified demo users.`);
    return provisioned;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  provisionDemoUsers()
    .catch((error) => {
      console.error('Demo-user provisioning failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

module.exports = { provisionDemoUsers, readDemoConfig };
