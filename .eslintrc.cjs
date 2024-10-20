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
    project: ['./tsconfig.json', './tsconfig.www.json'] // Include both TypeScript configs
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
    'no-unused-vars': 'off', // Turn off the base rule as it can report incorrect errors
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
      files: ['.eslintrc.cjs', 'vite.config.js', 'vite.worker.config.js', 'scripts/*', 'www/lib/*'],
      env: {
        node: true
      },
      parserOptions: {
        sourceType: 'script',
        project: null // Disable TypeScript parsing for these files
      }
    },
    {
      files: ['www/**/*.js', 'www/**/*.ts'],
      parserOptions: {
        project: './tsconfig.www.json' // Use tsconfig.www.json for files in the www directory
      }
    },
    {
      files: ['src/**/*.ts'],
      parserOptions: {
        project: './tsconfig.json' // Use main tsconfig.json for files in the src directory
      }
    }
  ]
};
