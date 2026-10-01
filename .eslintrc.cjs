/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  env: { browser: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  overrides: [
    {
      // SPEC §3.2 : le moteur ne dépend jamais de React.
      files: ['src/engine/**/*.ts', 'src/engine/**/*.tsx'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
                message: 'src/engine ne doit pas dépendre de React (SPEC §3.2).',
              },
              { group: ['**/react/**', '**/app/**'], message: 'src/engine ne doit pas importer la couche UI.' },
            ],
          },
        ],
      },
    },
    {
      // SPEC §4.1 : le parsing ne connaît ni Three.js ni React.
      files: ['src/engine/format/**/*.ts', 'src/engine/model/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
                message: 'src/engine ne doit pas dépendre de React (SPEC §3.2).',
              },
              {
                group: ['three', 'three/*'],
                message: 'Le format et le modèle ne dépendent pas de Three.js (SPEC §4.1).',
              },
              {
                group: ['**/render/**', '**/interaction/**', '**/react/**', '**/app/**'],
                message: 'Dépendance de couche interdite (SPEC §4.1).',
              },
            ],
          },
        ],
      },
    },
  ],
};
