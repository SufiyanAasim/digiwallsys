const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');

test('Expo metadata uses the digiwallsys identity', () => {
  const appConfig = JSON.parse(
    readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8')
  );
  assert.equal(appConfig.expo.name, 'digiwallsys');
  assert.equal(appConfig.expo.slug, 'digiwallsys');
});

test('mobile API URL is configurable', () => {
  const apiSource = readFileSync(
    join(__dirname, '../../src/mobile/api.js'),
    'utf8'
  );
  assert.match(apiSource, /EXPO_PUBLIC_API_URL/);
  assert.doesNotMatch(apiSource, /192\.168\./);
  assert.doesNotMatch(apiSource, /api\/wallet\/add/);
});

test('mobile navigation exposes advanced payment and security screens', () => {
  const appSource = readFileSync(join(__dirname, '../../src/mobile/App.js'), 'utf8');
  for (const screen of ['Payment Tools', 'QR Payment', 'Notifications', 'Security', 'Admin']) {
    assert.match(appSource, new RegExp(`name=\\"${screen}\\"`));
  }
});

test('Expo uses the generated digiwallsys logo and deep-link scheme', () => {
  const appConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8'));
  assert.equal(appConfig.expo.icon, './assets/digiwallsys-icon.png');
  assert.equal(appConfig.expo.scheme, 'digiwallsys');
});

test('every mobile icon slot uses the canonical logo asset', () => {
  const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const canonical = hash(join(__dirname, '../../assets/logo.png'));
  for (const filename of ['adaptive-icon.png', 'digiwallsys-icon.png', 'favicon.png', 'icon.png', 'splash-icon.png']) {
    assert.equal(hash(join(__dirname, '../../src/mobile/assets', filename)), canonical, filename);
  }
});

test('native package identifiers and EAS store profiles are configured', () => {
  const appConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8'));
  const easConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/eas.json'), 'utf8'));

  assert.equal(appConfig.expo.android.package, 'com.sufiyanaasim.digiwallsys');
  assert.equal(appConfig.expo.ios.bundleIdentifier, 'com.sufiyanaasim.digiwallsys');
  assert.equal(easConfig.build.preview.android.buildType, 'apk');
  assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
  assert.equal(easConfig.build.production.ios.simulator, false);
});
