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
      // Core `no-undef` does not treat a JSX element name as an identifier
      // reference, so a component used without being imported passed lint and
      // only blew up at runtime as "X is not defined". This rule is the one
      // that catches it.
      'react/jsx-no-undef': 'error',
      'react/prop-types': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
