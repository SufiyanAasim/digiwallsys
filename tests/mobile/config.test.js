const { readFileSync } = require('node:fs');
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
  assert.match(apiSource, /process\.env\.NODE_ENV === 'development'/);
  assert.match(apiSource, /https:\/\/digiwallsys-api\.onrender\.com/);
  assert.doesNotMatch(apiSource, /192\.168\./);
  assert.doesNotMatch(apiSource, /api\/wallet\/add/);
});

test('remembered sessions refresh before protected API requests expire', () => {
  const apiSource = readFileSync(
    join(__dirname, '../../src/mobile/api.js'),
    'utf8'
  );

  assert.match(apiSource, /function accessTokenExpiresSoon\(token\)/);
  assert.match(apiSource, /refreshToken && \(!token \|\| accessTokenExpiresSoon\(token\)\)/);
  assert.match(apiSource, /const session = await refreshSessionOnce\(\)/);
});

test('web dashboard tiles fill complete rows and orphan touch endings are ignored', () => {
  const homeSource = readFileSync(
    join(__dirname, '../../src/mobile/screens/HomeScreen.js'),
    'utf8'
  );
  const indexSource = readFileSync(
    join(__dirname, '../../src/mobile/index.js'),
    'utf8'
  );

  assert.match(homeSource, /WEB_TILE_MAX_COLUMNS = 6/);
  assert.match(homeSource, /onLayout=\{measureGrid\}/);
  assert.match(homeSource, /webWidth=\{webTileWidth\}/);
  assert.match(indexSource, /const activeTouchIds = new Set\(\)/);
  assert.match(indexSource, /event\.stopImmediatePropagation\(\)/);
});

test('mobile navigation exposes advanced payment and security screens', () => {
  const appSource = readFileSync(join(__dirname, '../../src/mobile/App.js'), 'utf8');
  for (const screen of ['Payment Tools', 'QR Payment', 'Notifications', 'Security', 'Admin']) {
    assert.match(appSource, new RegExp(`name=\\"${screen}\\"`));
  }
});

test('Expo uses the generated digiwallsys logo and deep-link scheme', () => {
  const appConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8'));
  assert.equal(appConfig.expo.icon, './assets/icon-app.png');
  assert.equal(appConfig.expo.scheme, 'digiwallsys');
});

test('every mobile icon slot resolves to an existing, consistent asset', () => {
  const appConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8'));
  const splashPlugin = appConfig.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
  );
  // The launcher icon and splash share the badged square mark.
  assert.equal(splashPlugin?.[1]?.image, appConfig.expo.icon);
  // The favicon deliberately does NOT: a browser tab renders it at ~16px, where
  // a gradient-filled badge collapses into a coloured blob. It is the bare "di"
  // monogram on transparency instead.
  assert.notEqual(appConfig.expo.web.favicon, appConfig.expo.icon);
  assert.equal(appConfig.expo.web.favicon, './assets/favicon.png');
  // The Android adaptive-icon foreground is a distinct full-bleed variant of the
  // same mark (no rounded corners baked in, so the OS mask can apply its own),
  // not a byte-identical copy — just assert every referenced file actually exists.
  for (const relativePath of [
    appConfig.expo.icon,
    appConfig.expo.web.favicon,
    appConfig.expo.android.adaptiveIcon.foregroundImage,
  ]) {
    assert.doesNotThrow(
      () => readFileSync(join(__dirname, '../../src/mobile', relativePath)),
      `${relativePath} should exist`
    );
  }
});

test('native package identifiers and EAS store profiles are configured', () => {
  const appConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/app.json'), 'utf8'));
  const easConfig = JSON.parse(readFileSync(join(__dirname, '../../src/mobile/eas.json'), 'utf8'));
  const projectId = '7c79c661-f3ea-4c5d-b207-77b8de410ba1';
  const productionApiUrl = 'https://digiwallsys-api.onrender.com';

  assert.equal(appConfig.expo.android.package, 'com.sufiyanaasim.digiwallsys');
  assert.equal(appConfig.expo.ios.bundleIdentifier, 'com.sufiyanaasim.digiwallsys');
  assert.equal(appConfig.expo.version, '1.8.0');
  assert.equal(appConfig.expo.android.versionCode, 10);
  assert.equal(appConfig.expo.ios.buildNumber, '5');
  assert.equal(appConfig.expo.extra.eas.projectId, projectId);
  assert.equal(easConfig.build.preview.android.buildType, 'apk');
  assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
  assert.equal(easConfig.build.production.autoIncrement, false);
  assert.equal(easConfig.build.production.ios.simulator, false);
  for (const profile of ['preview', 'production']) {
    assert.equal(easConfig.build[profile].env.EXPO_PUBLIC_API_URL, productionApiUrl);
    assert.equal(easConfig.build[profile].env.EXPO_PUBLIC_EAS_PROJECT_ID, projectId);
  }

  for (const template of [
    '../../.env.example',
    '../../examples/mobile.env.example',
    '../../examples/vercel.env.example',
  ]) {
    const templateSource = readFileSync(join(__dirname, template), 'utf8');
    assert.match(templateSource, new RegExp(productionApiUrl.replace(/[./]/g, '\\$&')));
    assert.match(templateSource, new RegExp(projectId));
  }
});

test('Android monorepo build delegates release bundling to Expo CLI', () => {
  const pluginSource = readFileSync(
    join(__dirname, '../../src/mobile/plugins/withAndroidMonorepoRoot.js'),
    'utf8'
  );

  assert.match(pluginSource, /node_modules\/expo\/bin\/cli/);
  assert.doesNotMatch(pluginSource, /node_modules\/@expo\/cli/);
  assert.match(pluginSource, /node_modules\/hermes-compiler\/hermesc/);
  assert.doesNotMatch(pluginSource, /react-native\/sdks\/hermesc/);
});

test('web sidebar stacks above the fixed ambient layer without changing native fill', () => {
  const ambientSource = readFileSync(
    join(__dirname, '../../src/mobile/components/AmbientBackground.js'),
    'utf8'
  );
  const sidebarSource = readFileSync(
    join(__dirname, '../../src/mobile/components/web/Sidebar.js'),
    'utf8'
  );
  const scrollbarSource = readFileSync(
    join(__dirname, '../../src/mobile/components/web/ScrollbarTheme.js'),
    'utf8'
  );

  assert.match(ambientSource, /web:\s*\{\s*position:\s*'fixed'/);
  assert.match(ambientSource, /default:\s*\{\s*\.\.\.StyleSheet\.absoluteFillObject/);
  assert.match(
    sidebarSource,
    /sidebar:\s*\{[\s\S]*?position:\s*'relative',[\s\S]*?zIndex:\s*1,/
  );
  assert.match(
    scrollbarSource,
    /html,\s*body,\s*#root\s*\{\s*background-color:\s*\$\{colors\.background\};\s*\}/
  );
});
