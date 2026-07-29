const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');

const {
  DEFAULT_PUBLIC_WEB_ORIGIN,
  resolveAllowedOrigins,
} = require('../../src/backend/config/cors');
const {
  readBootstrapConfig,
} = require('../../src/backend/scripts/create-admin-account');

test('production CORS always includes the canonical deployed web origin', () => {
  assert.deepEqual(
    resolveAllowedOrigins({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://preview.example.test/',
    }),
    [DEFAULT_PUBLIC_WEB_ORIGIN, 'https://preview.example.test']
  );
});

test('local development allows requests when no origin list is configured', () => {
  assert.equal(resolveAllowedOrigins({ NODE_ENV: 'development' }), true);
});

test('admin bootstrap requires explicit strong environment credentials', () => {
  assert.throws(
    () => readBootstrapConfig({}),
    /ADMIN_BOOTSTRAP_EMAIL/
  );
  assert.throws(
    () => readBootstrapConfig({
      ADMIN_BOOTSTRAP_EMAIL: 'owner@example.test',
      ADMIN_BOOTSTRAP_PASSWORD: 'too-short',
    }),
    /at least 12 characters/
  );

  assert.deepEqual(
    readBootstrapConfig({
      ADMIN_BOOTSTRAP_EMAIL: 'Owner@Example.Test',
      ADMIN_BOOTSTRAP_PASSWORD: 'A-safe-test-password-42',
      ADMIN_BOOTSTRAP_NAME: 'Wallet Owner',
    }),
    {
      email: 'owner@example.test',
      password: 'A-safe-test-password-42',
      name: 'Wallet Owner',
    }
  );
});

test('admin bootstrap source has no positional or logged password fallback', () => {
  const source = readFileSync(
    join(__dirname, '../../src/backend/scripts/create-admin-account.js'),
    'utf8'
  );

  assert.doesNotMatch(source, /process\.argv/);
  assert.doesNotMatch(source, /Password:\s*\$\{password\}/);
});
