# Lint des plugins : chemins résolus, imports dynamiques et globales

> Architecture du moteur — étanchéité des plugins ; suite de 281, 286, 287. Audit du 2026-10-07.

- Trous confirmés avec `eslint --stdin` sur des fichiers d'essai :
  - un plugin importe le point d'entrée du moteur (`'../../..'`, `'../../../index'`) : `PLUGIN_TRUNK` ne bloque que
    `**/Engine`, `**/events`, `**/plugins/index` (`.eslintrc.cjs:30`) ;
  - un mode importe une forme de `plugins/shapes/` (ex. `'../../shapes/general/title'`) ;
  - `import()` dynamique et `import.meta.glob` ne sont pas vus par `no-restricted-imports` ;
  - `window`, `document`, `globalThis` sont permis dans les plugins (`env.browser`).
- Correction :
  - règles sur chemins résolus (`import/no-restricted-paths` ou `eslint-plugin-boundaries`, via `make lock`) : un
    plugin n'importe que son dossier, `core/plugins`, `three`, et pour une forme `plugins/shapes/` ;
  - `no-restricted-syntax` sur `ImportExpression` et `import.meta` dans `src/engine/plugins/**` ;
  - `no-restricted-globals` (`window`, `document`, `globalThis`, `localStorage`, `setTimeout`, `setInterval`) dans
    `src/engine/plugins/**`.
  - `tests/engine/plugins/boundaries.test.ts` couvre les mêmes cas, ou est retiré si la lint les couvre tous.
- **Fini quand :** chacun des cas ci-dessus est refusé par `make lint` (fichiers d'essai, vérifiés puis retirés) ;
  les imports actuels des plugins passent ; `make check` vert.
- Fait :
  - `.eslintrc.cjs`, pour les formes, les modes et les effets (`src/engine/plugins/**`) :
    - `no-restricted-syntax` : `import()` et `import.meta` refusés (seule la racine de composition collecte les
      plugins) ;
    - `no-restricted-globals` : `window`, `document`, `globalThis`, `self`, `localStorage`, `sessionStorage`,
      `navigator`, `fetch`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `queueMicrotask` refusés.
  - **Écart avec le ticket** : pas de nouvelle extension ESLint (`import/no-restricted-paths`, `boundaries`) pour les
    chemins résolus. `tests/engine/plugins/boundaries.test.ts` (sujet 287) les vérifie déjà et refusait déjà deux des
    trous relevés par l'audit (point d'entrée du moteur importé par un plugin, forme générale importée par un fichier
    de mode hors `shapes/`) : l'audit n'avait essayé que la lint. Il reste, et `make check` le lance.
  - Vérifié par des fichiers d'essai, retirés ensuite :
    - un mode, une forme et un effet qui utilisent `import()`, `import.meta.glob`, `window`, `document`,
      `globalThis`, `localStorage`, `setTimeout`, `requestAnimationFrame` : 10 erreurs de `make lint` ;
    - un mode qui importe `'../../..'` (point d'entrée du moteur) et `'../../shapes/general/title'`, une forme qui
      importe `'../../../../index'` : refusés par le test des frontières ;
    - les plugins actuels passent.
  - Doc : `AJOUTER_UN_MODE.md`, `.claude/rules/coding.md` §5.
  - Rien de visible dans l'appli.
