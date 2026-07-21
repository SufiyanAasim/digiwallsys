const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
const app = require('../../src/backend/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('health endpoint identifies digiwallsys', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    name: 'digiwallsys',
    status: 'ok',
    version: '1.0.0',
  });
});

test('wallet endpoints require a bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/wallet/balance`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Authentication required' });
});

test('unknown routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route not found' });
});

test('administrator routes require authentication', async () => {
  const response = await fetch(`${baseUrl}/api/admin/overview`);
  assert.equal(response.status, 401);
});

test('funding webhooks reject missing signatures before database access', async () => {
  const response = await fetch(`${baseUrl}/api/funding/webhooks/sandbox`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventId: 'test', providerReference: 'test', status: 'succeeded' }),
  });
  assert.equal(response.status, 401);
});
