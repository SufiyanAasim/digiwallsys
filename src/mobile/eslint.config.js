const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactNative = require('eslint-plugin-react-native');

const runtimeGlobals = Object.fromEntries(
  Object.entries({ ...globals.es2021, ...globals.browser, ...globals.node })
    .map(([name, value]) => [name.trim(), value])
);

module.exports = [
  { ignores: ['node_modules/**', '.expo/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: runtimeGlobals,
    },
    plugins: { react, 'react-native': reactNative },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
