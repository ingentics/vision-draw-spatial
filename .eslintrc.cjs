/* eslint-env node */
const fs = require('fs');
const path = require('path');

/** Dossiers d'un répertoire (un par mode de page). */
const folders = (dir) =>
  fs
    .readdirSync(path.join(__dirname, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const NO_REACT = {
  group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'src/engine ne doit pas dépendre de React (SPEC §3.2).',
};
const NO_UI = { group: ['**/react/**', '**/app/**'], message: 'src/engine ne doit pas importer la couche UI.' };
const ENGINE_ENTRY = {
  group: ['**/engine/*'],
  message: "Importer depuis le point d'entrée du moteur (`engine`, src/engine/index.ts), pas un fichier interne.",
};
/** Ticket 281 : modes de page, un par dossier de `src/engine/modes/`. */
const ENGINE_MODES = folders('src/engine/modes');
const NO_MODE = {
  group: ENGINE_MODES.flatMap((mode) => [`**/modes/${mode}`, `**/modes/${mode}/**`]),
  message:
    "Le moteur ne connaît aucun mode précis : il passe par le registre (modes/registry) et le contrat d'un mode (modes/types).",
};

/** Ticket 281 : un mode de page n'importe ni le cœur du moteur, ni un autre mode. */
const engineModeOverrides = ENGINE_MODES.map((mode) => ({
  files: [`src/engine/modes/${mode}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          NO_REACT,
          NO_UI,
          {
            group: [
              '**/Engine',
              '**/core/**',
              '**/format/**',
              '**/interaction/**',
              '**/persistence/**',
              '**/graph/**',
              '**/effects/**',
            ],
            message:
              "Un mode n'importe pas le cœur du moteur : il ne connaît que son contrat (modes/types), le modèle et les briques de dessin.",
          },
          ...ENGINE_MODES.filter((other) => other !== mode).map((other) => ({
            group: [`**/${other}/**`],
            message: `Un mode n'importe pas un autre mode (ici « ${other} ») : voir modes/types.`,
          })),
        ],
      },
    ],
  },
}));

/** Ticket 281 : la partie appli d'un mode n'importe pas celle d'un autre mode. */
const APP_MODES = folders('src/app/modes');
const appModeOverrides = APP_MODES.map((mode) => ({
  files: [`src/app/modes/${mode}/**/*.ts`, `src/app/modes/${mode}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // Ticket 282 : en plus du point d'entrée, l'API de son mode (`engine/modes/<id>/api`), et seulement elle.
          {
            message: `Importer depuis le point d'entrée du moteur (\`engine\`) ou l'API de son mode (\`engine/modes/${mode}/api\`), pas un fichier interne.`,
            group: [
              ...ENGINE_ENTRY.group,
              '!**/engine/modes',
              '**/engine/modes/*',
              `!**/engine/modes/${mode}`,
              `**/engine/modes/${mode}/*`,
              `!**/engine/modes/${mode}/api`,
            ],
          },
          ...APP_MODES.filter((other) => other !== mode).map((other) => ({
            group: [`**/${other}/**`],
            message: `La partie appli d'un mode n'importe pas celle d'un autre mode (ici « ${other} »).`,
          })),
        ],
      },
    ],
  },
}));

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
  ignorePatterns: ['dist', 'dist-lib', 'dist-desktop', 'desktop', 'node_modules', '.eslintrc.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
  },
  overrides: [
    {
      // Ticket 207 : l'interface et l'API de la bibliothèque passent par le point d'entrée du moteur.
      files: ['src/app/**/*.ts', 'src/app/**/*.tsx', 'src/react/**/*.ts', 'src/react/**/*.tsx', 'src/index.ts'],
      rules: { 'no-restricted-imports': ['error', { patterns: [ENGINE_ENTRY] }] },
    },
    ...appModeOverrides,
    {
      // SPEC §3.2 : le moteur ne dépend jamais de React. Ticket 281 : ni d'un mode précis.
      files: ['src/engine/**/*.ts', 'src/engine/**/*.tsx'],
      excludedFiles: ['src/engine/modes/*/**'],
      rules: { 'no-restricted-imports': ['error', { patterns: [NO_REACT, NO_UI, NO_MODE] }] },
    },
    ...engineModeOverrides,
    {
      // SPEC §4.1 : le parsing ne connaît ni Three.js ni React.
      files: ['src/engine/format/**/*.ts', 'src/engine/model/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              NO_REACT,
              {
                group: ['three', 'three/*'],
                message: 'Le format et le modèle ne dépendent pas de Three.js (SPEC §4.1).',
              },
              {
                group: ['**/render/**', '**/interaction/**', '**/react/**', '**/app/**'],
                message: 'Dépendance de couche interdite (SPEC §4.1).',
              },
              NO_MODE,
            ],
          },
        ],
      },
    },
  ],
};
