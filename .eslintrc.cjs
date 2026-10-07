/* eslint-env node */
const fs = require('fs');
const path = require('path');

/** Dossiers d'un répertoire (un par plugin). */
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
/** Sujet 286 : le tronc (`core/`) ne connaît aucun plugin ; seule la racine de composition (`plugins/index.ts`) les collecte. */
const NO_PLUGIN = {
  group: ['**/plugins', '**/plugins/**'],
  message:
    'Le tronc ne connaît aucun plugin : il passe par les registres (core/shapes, core/modes, core/effects) et leurs contrats.',
};
/**
 * Sujet 287 : ce qu'un plugin importe du tronc passe par son API, `core/plugins` (liste blanche). Motifs gitignore sur le
 * texte de l'import : `core/plugins` est réadmis après l'exclusion de tout `core/`.
 */
const PLUGIN_TRUNK = {
  group: ['**/core/**', '!**/core/plugins', '**/Engine', '**/events', '**/plugins/index'],
  message:
    "Un plugin n'importe du tronc que son API (`core/plugins`) : une brique commune qui manque s'ajoute à core/plugins/index.ts.",
};
/** Sujet 287 : seul paquet externe permis à un plugin, `three` (le reste passe par l'API des plugins). */
const PLUGIN_PACKAGES = {
  group: ['/[a-z@]*', '!/three'],
  message: "Un plugin n'utilise que `three` et l'API des plugins (`core/plugins`).",
};

/**
 * Sujet 305 : un plugin ne charge rien par lui-même (`import()`, `import.meta.glob` : seule la racine de composition
 * collecte les plugins) et ne touche pas aux globales du navigateur (il vit dans le moteur, sans DOM ni minuterie).
 */
const PLUGIN_SYNTAX = [
  'error',
  { selector: 'ImportExpression', message: "Un plugin n'importe rien dynamiquement (`import()`)." },
  {
    selector: "MetaProperty[meta.name='import']",
    message:
      "Un plugin n'utilise pas `import.meta` : seule la racine de composition (`plugins/index.ts`) collecte les plugins.",
  },
];
const PLUGIN_GLOBALS = [
  'error',
  ...['window', 'document', 'globalThis', 'self', 'localStorage', 'sessionStorage', 'navigator', 'fetch'].map(
    (name) => ({
      name,
      message: "Un plugin ne touche pas aux globales du navigateur : il passe par l'API des plugins.",
    }),
  ),
  ...['setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask'].map((name) => ({
    name,
    message: "Un plugin n'a pas de minuterie : le moteur l'appelle quand il le faut.",
  })),
];

/** Sujet 286 : formes, modes et effets, un dossier par plugin dans `src/engine/plugins/`. */
const ENGINE_MODES = folders('src/engine/plugins/modes');
const ENGINE_EFFECTS = folders('src/engine/plugins/effects');

/** Ticket 281, sujet 286 : un mode n'importe ni le cœur du moteur, ni un autre mode, ni un effet. */
const engineModeOverrides = ENGINE_MODES.map((mode) => ({
  files: [`src/engine/plugins/modes/${mode}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          NO_REACT,
          NO_UI,
          PLUGIN_TRUNK,
          PLUGIN_PACKAGES,
          // Motifs sur le texte de l'import (pas le chemin résolu) : on nomme les dossiers.
          { group: ['**/effects/**'], message: "Un mode n'importe pas un effet." },
          ...ENGINE_MODES.filter((other) => other !== mode).map((other) => ({
            group: [`**/${other}`, `**/${other}/**`],
            message: `Un mode n'importe pas un autre mode (ici « ${other} ») : voir core/modes/types.`,
          })),
        ],
      },
    ],
    'no-restricted-syntax': PLUGIN_SYNTAX,
    'no-restricted-globals': PLUGIN_GLOBALS,
  },
}));

/** Sujet 286 : un effet n'importe ni le cœur du moteur, ni un autre plugin. */
const engineEffectOverrides = ENGINE_EFFECTS.map((effect) => ({
  files: [`src/engine/plugins/effects/${effect}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          NO_REACT,
          NO_UI,
          PLUGIN_TRUNK,
          PLUGIN_PACKAGES,
          {
            group: ['**/modes/**', '**/shapes/**'],
            message: "Un effet n'importe ni un mode ni une forme (ni leurs registres : seulement son contrat).",
          },
          ...ENGINE_EFFECTS.filter((other) => other !== effect).map((other) => ({
            group: [`**/${other}`, `**/${other}/**`],
            message: `Un effet n'importe pas un autre effet (ici « ${other} ») : voir core/effects/types.`,
          })),
        ],
      },
    ],
    'no-restricted-syntax': PLUGIN_SYNTAX,
    'no-restricted-globals': PLUGIN_GLOBALS,
  },
}));

/** Ticket 281 : la partie appli d'un mode n'importe pas celle d'un autre mode. */
const APP_MODES = folders('src/app/plugins/modes');
const appModeOverrides = APP_MODES.map((mode) => ({
  files: [`src/app/plugins/modes/${mode}/**/*.ts`, `src/app/plugins/modes/${mode}/**/*.tsx`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // Ticket 282 : en plus du point d'entrée, l'API de son mode (`engine/plugins/modes/<id>/api`), et seulement elle.
          {
            message: `Importer depuis le point d'entrée du moteur (\`engine\`) ou l'API de son mode (\`engine/plugins/modes/${mode}/api\`), pas un fichier interne.`,
            group: [
              ...ENGINE_ENTRY.group,
              '!**/engine/plugins',
              '**/engine/plugins/*',
              '!**/engine/plugins/modes',
              '**/engine/plugins/modes/*',
              `!**/engine/plugins/modes/${mode}`,
              `**/engine/plugins/modes/${mode}/*`,
              `!**/engine/plugins/modes/${mode}/api`,
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
      // SPEC §3.2 : le moteur ne dépend jamais de React.
      files: ['src/engine/**/*.ts', 'src/engine/**/*.tsx'],
      rules: { 'no-restricted-imports': ['error', { patterns: [NO_REACT, NO_UI] }] },
    },
    {
      // Sujet 286 : ni d'un plugin précis.
      files: ['src/engine/core/**/*.ts'],
      rules: { 'no-restricted-imports': ['error', { patterns: [NO_REACT, NO_UI, NO_PLUGIN] }] },
    },
    {
      // Sujet 286 : une forme peut en étendre une autre, mais n'importe ni le cœur du moteur, ni un mode, ni un effet.
      files: ['src/engine/plugins/shapes/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              NO_REACT,
              NO_UI,
              PLUGIN_TRUNK,
              PLUGIN_PACKAGES,
              {
                group: ['**/modes/**', '**/effects/**'],
                message: "Une forme n'importe ni un mode ni un effet.",
              },
            ],
          },
        ],
        'no-restricted-syntax': PLUGIN_SYNTAX,
        'no-restricted-globals': PLUGIN_GLOBALS,
      },
    },
    ...engineModeOverrides,
    ...engineEffectOverrides,
    {
      // SPEC §4.1 : le parsing ne connaît ni Three.js ni React.
      files: ['src/engine/core/format/**/*.ts', 'src/engine/core/model/**/*.ts'],
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
                group: ['**/core/render/**', '**/core/interaction/**', '**/react/**', '**/app/**'],
                message: 'Dépendance de couche interdite (SPEC §4.1).',
              },
              NO_PLUGIN,
            ],
          },
        ],
      },
    },
  ],
};
