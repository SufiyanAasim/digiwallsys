const { createHmac } = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashToken, randomToken, verifyHmac } = require('../../src/backend/utils/crypto');

test('opaque tokens are random and stored through stable hashes', () => {
  const first = randomToken();
  const second = randomToken();
  assert.notEqual(first, second);
  assert.equal(hashToken(first).length, 64);
  assert.equal(hashToken(first), hashToken(first));
});

test('provider signatures use timing-safe SHA-256 HMAC comparison', () => {
  const payload = Buffer.from('{"eventId":"event-1"}');
  const secret = 'test-webhook-secret';
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifyHmac(payload, signature, secret), true);
  const invalid = `${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`;
  assert.equal(verifyHmac(payload, invalid, secret), false);
  assert.equal(verifyHmac(payload, '', secret), false);
});
