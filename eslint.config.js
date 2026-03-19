// eslint.config.js
// ESLint v9 flat config for this project.
// Fully replaces the legacy `.eslintrc.json`.

const nextConfig = require('eslint-config-next');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');

/** @type {import("eslint").Linter.FlatConfig[]} */
module.exports = [
  // Base Next.js + TypeScript config (includes @next/next, @typescript-eslint, import, etc.)
  ...nextConfig,

  // Project-wide JS/TS rules layered on top of Next's config.
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  // TypeScript-specific override for unused vars.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Project-specific ignores.
  {
    ignores: ['dist/*', 'src/gql/*'],
  },
];
