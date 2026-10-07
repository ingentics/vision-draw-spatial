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
