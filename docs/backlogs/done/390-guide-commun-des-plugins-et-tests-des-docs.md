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
- Fait : `docs/AJOUTER_UN_PLUGIN.md` (nouveau) écrit le patron commun une fois : dossier et `definition`, id (nom du
  dossier, `PLUGIN_ID_PATTERN`, id déjà pris refusé), collecte par `plugins/index.ts` (`import.meta.glob`), API des
  plugins, lecture seule et gel (pas de `this`, pas d'état de module), appel protégé `callPlugin` et Diagnostics,
  schéma commun des champs (tableau des `type`, déplacé du guide des modes) et réglages globaux `PluginSetting` des
  trois propriétaires (mode, effet, catégorie de formes), tests de contrat, ce qui touche encore le tronc,
  récapitulatif. `docs/AJOUTER_UN_EFFET.md` (nouveau) : dossier, tableau du contrat, `volume` (`EffectRoom`,
  `EffectLight`, `values`), quand il est appelé, panne (décor omis), réglages, `spatial.effects` et refus par le mode,
  frontières, test modèle. `AJOUTER_UNE_FORME.md` et `AJOUTER_UN_MODE.md` allégés de ce qui est commun (frontières,
  registre et vue de l'appli, lecture seule, appel protégé, schéma des champs, enregistrement des réglages, `legacy`) et
  y renvoient ; `.claude/rules/coding.md` §1 et §2 et `SUMMARY.md` §5 citent les deux nouveaux guides. API des
  plugins : `EffectRoom` réexporté (type seul, sans changement de comportement ; il manquait pour typer une fonction
  d'aide d'un effet, comme `EffectLight`). Tests des docs (`tests/docHelpers.ts`) :
  `tests/engine/core/shapes/contractDoc.test.ts` (membres de `ShapeDefinition` ↔ tableau du guide des formes),
  `tests/engine/core/effects/contractDoc.test.ts` (membres de `PageEffectDefinition` ↔ tableau du guide des effets),
  `tests/engine/core/plugins/guides.test.ts` (types, constantes et fonctions appelées cités entre backticks dans les
  quatre guides : exportés par l'API, membres d'un contrat, ou dans une liste blanche commentée qui ne doit contenir
  que des noms cités et absents de l'API), `tests/docs/paths.test.ts` (chemins entre backticks `src/…`, `tests/…`,
  `docs/…`, `engine/…`, `core/…`, `plugins/…` de `docs/*.md`, `CLAUDE.md` et `.claude/rules/coding.md`, et liens
  relatifs de `docs/*.md`, existants ; backlogs exclus, chemins à compléter `<id>` ignorés). Chaque test essayé en
  échec puis remis : chemin et lien faux, module absent, symbole inventé (`fooBar(x)`, `NotExported`), ligne
  `swatch` retirée du tableau des formes, `viewModes` renommé dans celui des effets. Essai du « Fini quand » : un effet
  jetable `plugins/effects/plinth/` (dalle sous le schéma, un réglage) et son test, écrits en ne lisant que les
  guides, passent tests, lint, types et frontières, puis supprimés. Dette notée : 405. `make check` vert ; rien vérifié
  dans l'appli (docs et tests seulement).
