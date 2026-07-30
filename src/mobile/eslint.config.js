const js = require('@eslint/js');
const globals = require('globals');

const runtimeGlobals = Object.fromEntries(
  Object.entries({ ...globals.es2021, ...globals.browser, ...globals.node })
    .map(([name, value]) => [name.trim(), value])
);

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'dist-ios/**',
      'dist-web/**',
      'android/**',
      'ios/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: runtimeGlobals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
