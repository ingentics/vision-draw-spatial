# Guide commun des plugins, guide des effets, docs testées

> Documentation — extensibilité. Audit du 2026-10-08 (`AUDIT.md`). Après 378 et 380 (le patron commun doit exister).

- Les trois familles suivent le même patron (dossier, `definition`, collecte par `plugins/index.ts`, API des plugins,
  lecture seule et gel, appel protégé et Diagnostics, réglages `PluginSetting`, tests de contrat) mais il n'est écrit
  nulle part ; les effets n'ont aucun guide (contrat seulement dans la JSDoc de `core/effects/types.ts` :
  `volume(page, room, values, light)`, `EffectRoom`, `EffectLight`, écriture `spatial.effects`, refus par le mode,
  test modèle `tests/engine/plugins/effects/forest.test.ts`).
- Ce qu'on veut :
  - `docs/AJOUTER_UN_PLUGIN.md` : le patron commun, une fois ; `AJOUTER_UNE_FORME.md` et `AJOUTER_UN_MODE.md` ne
    gardent que leur spécificité et y renvoient ;
  - `docs/AJOUTER_UN_EFFET.md` court (contrat, pannes, réglages, frontières, test), cité par `coding.md` §1 et
    SUMMARY §5 ;
  - tests des docs, sur le modèle de `tests/engine/core/modes/contractDoc.test.ts` : membres de `ShapeDefinition` et
    de `PageEffectDefinition` ↔ tableaux de leurs guides ; symboles entre backticks des guides exportés par
    `core/plugins/index.ts` (liste blanche) ; chemins `src/…` et `tests/…` cités dans `docs/*.md` existants.
- **Fini quand :** un agent ajoute un effet de test (dossier jetable) en ne lisant que les guides ; les tests des docs
  passent et échouent sur un chemin cité volontairement faux ; `make check` vert.
