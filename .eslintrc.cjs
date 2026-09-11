module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    projectService: true
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'arrow-body-style': ['error', 'as-needed'],
    'func-style': ['error', 'expression'],
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    indent: ['error', 2],
    'brace-style': ['error', '1tbs'],
    'no-var': 'error',
    'prefer-const': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'off'
  },
  overrides: [
    {
      files: ['.eslintrc.cjs', 'vite.config.js', 'vite.worker.config.js'],
      env: {
        node: true
      },
      parserOptions: {
        sourceType: 'script',
        projectService: false
      }
    }
  ]
};
