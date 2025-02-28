module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser for TypeScript
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  extends: [
    'eslint:recommended', // Uses the recommended rules from ESLint
    'plugin:@typescript-eslint/recommended', // Uses the TypeScript recommended rules
    'plugin:import/errors', // Lint import errors
    'plugin:import/warnings', // Lint import warnings
    'plugin:import/typescript', // Support TypeScript import rules
    'plugin:node/recommended', // Recommended rules for Node.js
    'prettier', // Enables eslint-config-prettier. Make sure this is **last** in the extends array.
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays Prettier errors as ESLint errors. Make sure this is **last** in the extends array.
    'plugin:@nrwl/nx/recommended', // Nx recommended rules
  ],
  plugins: ['@typescript-eslint', 'import', 'node', 'prettier', '@nrwl/nx'],
  rules: {
    // Customize rules here
    'no-unused-vars': 'warn', // or 'error'
    'no-console': 'warn', // or 'error' in production
    'import/no-unresolved': 'error',
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }], // Allow ES modules in Node.js
    'node/no-missing-import': 'off', // Handled by TypeScript and import/no-unresolved
    'node/no-extraneous-import': 'error',
    'node/shebang': 'off', // Allow shebang for executables if needed
    '@typescript-eslint/explicit-function-return-type': 'off', // Optional: Consider enabling for stricter typing
    '@typescript-eslint/no-explicit-any': 'off', // Optional: Consider enabling to avoid 'any' type
  },
  settings: {
    'import/resolver': {
      typescript: {}, // tells eslint-plugin-import to use TypeScript's compiler for resolving imports
    },
    nx: {}, // Nx settings
  },
};
