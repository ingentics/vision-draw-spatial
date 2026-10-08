# Surface de la façade et des API : ce qui sert, rien de plus

> Architecture du moteur — façade qui délègue (`coding.md` §3, §6) ; suite de 314. Audit du 2026-10-08 (`AUDIT.md`).

- Façade (`src/engine/Engine.ts`) :
  - calcul dans la façade : `paletteFor`, `usedTemplates`, `allowedEffects` (`Engine.ts:471-486`) → délèguent
    (`pageModes`, registre ; `allowedEffects` par 378) ;
  - 25 méthodes publiques sans appelant (ni appli, ni composant, ni `src/index.ts`, ni test, absentes de SPEC §4.3) :
    `canUndo`, `canRedo`, `fitToBounds`, `followLink`, `getBackTarget`, `getCachedPageIds`, `getDocument`,
    `getGraphPage`, `getOverviewState`, `getPageScene`, `getReferenceRotation`, `getViewMode`, `getXmlTree`,
    `isEditable`, `isTransitioning`, `modeKey`, `pickAt`, `placementVariant`, `preloadLink`, `reducedMotion`,
    `selectAll`, `toggle3d`, `toggleFlatten`, `toggleGraph`, `toggleViewMode` ;
  - doc de `setModeProperty` placée au-dessus de `modePropertyViews` (`Engine.ts:514-519`) ;
  - types réexportés deux fois (`Engine.ts:39-54` puis `index.ts:8-22`) : `index.ts` les prend dans
    `core/domains/types`.
- **À trancher avec l'utilisateur** : les 25 méthodes sont-elles l'API de la bibliothèque (alors listées dans SPEC
  §4.3 et `COMPOSANT.md`) ou retirées (comme en 314) ? Proposition : garder celles qu'un intégrateur attend
  (`canUndo`, `canRedo`, `selectAll`, `getDocument`, `getViewMode`, `isEditable`, `toggle*`), retirer les autres.
- `src/engine/index.ts:122` exporte `usedTemplates` et `PALETTE_CATEGORIES` que seuls les tests lisent : les tests
  passent par `createDefaultRegistry()` + `usedTemplatesIn` ; `shapesByMode` (`core/modes/modeShapes.ts:7-15`, découpe
  les chemins du glob) va dans `plugins/`, son seul appelant.
- Code mort : `setLocalEmbedding` (`render/space.ts:45`, aucun appelant) ; ≈ 40 `export` lus seulement dans leur
  fichier (ex. `constraintPrefix`, `pointOnSide`, `DEFAULT_BEND_COSTS`, `matchesLayout`, `clampZoom`, `clampTilt`,
  `screenAxes`, `verticalScale`, `OVERVIEW_CYCLE`, `growRegions`, `styleNewRegion`, `orderRegions`, `extentOf`,
  `FIELD_KINDS`, `KEY_TYPES`, `storedArrivals`, `tableStyle`, `buildingHeight`, `CYLINDER_RING`, `stencilXml`,
  `toMeta`, `errorMessage`, `MODIFIER_KEY_LABELS`, `GRAPH_PAGE_NAME`) : retirer l'`export` (recherche relue dans
  `src/` et `tests/`).
- API des plugins : `spatialFlag` sans usage → retiré ; `darken`, `roundedRectPath` documentés comme briques → gardés
  avec un commentaire.
- `group.name = \`shape:${id}\`` posé neuf fois et lu par personne (`box.ts:38`, `block.ts:81`, `shapes/group.ts:13`,
  `table.ts:110`, région, accolade, acteurs ×2, bâtiment) : posé une fois dans `createShapeObject`
  (`render/pageScene.ts:195`) ou supprimé.
- Écart : aucun pour l'appli ; une méthode retirée l'est aussi de l'API de la bibliothèque (à annoncer dans le
  « Fait : » et le CHANGELOG).
- **Fini quand :** chaque méthode publique de `Engine` a un appelant ou figure dans SPEC §4.3 ; aucun `export` sans
  lecteur hors API documentée ; `make check` et `make lib` verts.
