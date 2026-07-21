const { createHmac } = require('node:crypto');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

if (!process.env.TEST_DATABASE_URL) {
  test('PostgreSQL integration suite', { skip: 'TEST_DATABASE_URL is not configured' }, () => {});
} else {
  if (!/[_-]test(?:\?|$)/.test(process.env.TEST_DATABASE_URL)) {
    throw new Error('Refusing to run destructive integration setup against a non-test database');
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DATABASE_SSL = 'false';
  process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
  process.env.FUNDING_WEBHOOK_SECRET = 'integration-funding-secret';
  process.env.NODE_ENV = 'test';

  const pool = require('../../src/backend/db');
  const app = require('../../src/backend/app');
  let server;
  let baseUrl;

  async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function registerAndLogin(name, email) {
    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { name, email, password: 'SecurePass123!' },
    });
    assert.equal(registration.status, 201);
    const verification = await request('/api/auth/verify-email', {
      method: 'POST', body: { token: registration.body.verificationToken },
    });
    assert.equal(verification.status, 200);
    const login = await request('/api/auth/login', {
      method: 'POST', body: { email, password: 'SecurePass123!' },
    });
    assert.equal(login.status, 200);
    return login.body;
  }

  async function fund(session, amount, key) {
    const intent = await request('/api/funding/intents', {
      method: 'POST', token: session.accessToken, body: { amount },
      headers: { 'idempotency-key': key },
    });
    assert.equal(intent.status, 201);
    const payload = JSON.stringify({
      eventId: `event-${key}`,
      providerReference: intent.body.intent.provider_reference,
      status: 'succeeded',
    });
    const signature = createHmac('sha256', process.env.FUNDING_WEBHOOK_SECRET)
      .update(payload).digest('hex');
    const response = await fetch(`${baseUrl}/api/funding/webhooks/sandbox`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-provider-signature': signature },
      body: payload,
    });
    assert.equal(response.status, 200);
  }

  before(async () => {
    const migrations = join(__dirname, '../../config/migrations');
    for (const filename of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
      await pool.query(readFileSync(join(migrations, filename), 'utf8'));
    }
    await pool.query(`
      TRUNCATE TABLE
        provider_events, reconciliation_runs, notifications, push_devices,
        notification_preferences, scheduled_transfers, payment_requests,
        fraud_events, funding_intents, ledger_entries, transactions,
        ledger_journals, ledger_accounts, idempotency_records, audit_logs,
        email_outbox, action_tokens, refresh_tokens, wallet, users
      RESTART IDENTITY CASCADE
    `);
    await pool.query(`
      INSERT INTO ledger_accounts(code, account_type, currency)
      VALUES ('provider-clearing:USD', 'provider_clearing', 'USD')
      ON CONFLICT DO NOTHING
    `);
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  test('verified funding, idempotent transfer, ledger, search, and reconciliation', async () => {
    const sender = await registerAndLogin('Sender', 'sender@example.test');
    const receiver = await registerAndLogin('Receiver', 'receiver@example.test');
    await fund(sender, 100, 'fund-sender-1');

    const transferRequest = {
      method: 'POST',
      token: sender.accessToken,
      body: { receiverId: receiver.user.id, amount: 30, description: 'Integration payment' },
      headers: { 'idempotency-key': 'transfer-one' },
    };
    const transfer = await request('/api/transactions/send', transferRequest);
    assert.equal(transfer.status, 200);
    const replay = await request('/api/transactions/send', transferRequest);
    assert.equal(replay.status, 200);
    assert.equal(replay.body.transaction.reference, transfer.body.transaction.reference);

    const senderBalance = await request('/api/wallet/balance', { token: sender.accessToken });
    const receiverBalance = await request('/api/wallet/balance', { token: receiver.accessToken });
    assert.equal(Number(senderBalance.body.balance), 70);
    assert.equal(Number(receiverBalance.body.balance), 30);

    const history = await request('/api/transactions/history?q=Integration', { token: sender.accessToken });
    assert.equal(history.status, 200);
    assert.equal(history.body.items.length, 1);

    const unbalanced = await pool.query(`
      SELECT lj.journalid
      FROM ledger_journals lj JOIN ledger_entries le ON le.journalid = lj.journalid
      GROUP BY lj.journalid
      HAVING SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount ELSE -le.amount END) <> 0
    `);
    assert.equal(unbalanced.rowCount, 0);

    await pool.query("UPDATE users SET role = 'admin' WHERE email = 'sender@example.test'");
    const adminLogin = await request('/api/auth/login', {
      method: 'POST', body: { email: 'sender@example.test', password: 'SecurePass123!' },
    });
    const reconciliation = await request('/api/admin/reconciliation', {
      method: 'POST', token: adminLogin.body.accessToken,
    });
    assert.equal(reconciliation.status, 200);
    assert.equal(reconciliation.body.discrepancy_count, 0);
  });

  test('concurrent transfers cannot overdraw a wallet', async () => {
    const sender = await registerAndLogin('Concurrent Sender', 'concurrent@example.test');
    const receiver = await registerAndLogin('Concurrent Receiver', 'receiver2@example.test');
    await fund(sender, 100, 'fund-concurrent');

    const makeTransfer = (key) => request('/api/transactions/send', {
      method: 'POST', token: sender.accessToken,
      body: { receiverId: receiver.user.id, amount: 80, description: 'Race test' },
      headers: { 'idempotency-key': key },
    });
    const results = await Promise.all([makeTransfer('race-one'), makeTransfer('race-two')]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 400]);
    const balance = await request('/api/wallet/balance', { token: sender.accessToken });
    assert.equal(Number(balance.body.balance), 20);
  });
}
