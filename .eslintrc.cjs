module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Integrates ESLint with Prettier
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Add your custom rules here
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'prettier/prettier': ['error', {
      endOfLine: 'lf'
    }],
  },
};
