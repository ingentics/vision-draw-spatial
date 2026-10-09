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
  fichier (ex. `constraintPrefix`, `DEFAULT_BEND_COSTS`, `matchesLayout`, `clampZoom`, `clampTilt`,
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
- Fait :
  - **Façade** (`src/engine/Engine.ts`) : gardées et documentées (SPEC §4.3, `docs/COMPOSANT.md`) `canUndo`, `canRedo`,
    `selectAll`, `getDocument`, `getViewMode`, `isEditable`, `toggle3d`, `toggleFlatten`, `toggleGraph`,
    `toggleViewMode`, et `followLink` (déjà citée dans `COMPOSANT.md` parmi les méthodes utiles du moteur : gardée et
    ajoutée à SPEC §4.3). Retirées, sans appelant (vérifié dans `src/`, `tests/`, `examples/`, `desktop/`, docs) :
    `fitToBounds`, `getBackTarget`, `getCachedPageIds`, `getGraphPage`, `getOverviewState`, `getPageScene`,
    `getReferenceRotation`, `getXmlTree`, `isTransitioning`, `modeKey`, `pickAt`, `placementVariant`, `preloadLink`,
    `reducedMotion` : **elles disparaissent de l'API de la bibliothèque** (`Engine` exporté par `src/index.ts`). Les
    méthodes des domaines restent (appelées en interne), sauf `SceneView.getPageScene` / `getCachedPageIds`, mortes
    avec elles. `paletteFor` délègue à `PageModes.palette(page)`, `usedTemplates` à `ShapeRegistry.usedTemplates(page)`
    (`usedTemplatesIn`) ; `allowedEffects` déléguait déjà (378). Doc de `setModeProperty` remise au-dessus de sa
    méthode. Types : `Engine.ts` ne réexporte plus rien, `src/engine/index.ts` les prend dans `core/domains/types`.
  - **Exports** : `src/engine/index.ts` n'exporte plus `usedTemplates` ni `PALETTE_CATEGORIES` ; la fonction
    `usedTemplates` de la racine de composition est supprimée (le test passe par `createDefaultRegistry().usedTemplates`),
    `PALETTE_CATEGORIES` n'est plus réexporté par `plugins/index.ts` (les tests le lisent dans
    `plugins/shapes/categories.ts`). `shapesByMode` quitte `core/modes/modeShapes.ts` (supprimé) pour
    `plugins/index.ts`, son seul appelant (un fichier à part sous `plugins/` serait pris pour un plugin par
    `boundaries.test.ts`). `export` retiré de 49 valeurs lues seulement dans leur fichier (fonctions et constantes, dont
    celles de l'audit : `constraintPrefix`, `DEFAULT_BEND_COSTS`, `matchesLayout`, `clampZoom`, `clampTilt`,
    `screenAxes`, `verticalScale`, `OVERVIEW_CYCLE`, `growRegions`, `styleNewRegion`, `orderRegions`, `extentOf`,
    `FIELD_KINDS`, `KEY_TYPES`, `storedArrivals`, `tableStyle`, `buildingHeight`, `CYLINDER_RING`, `stencilXml`,
    `toMeta`, `errorMessage`, `MODIFIER_KEY_LABELS`, `GRAPH_PAGE_NAME`, plus p. ex. `MIN_ZOOM`, `ROUTERS`,
    `flatMaterial`, `pickFontKey`, et dans l'appli `keyLabel`, `SIZE_LIMITS`, `stripMarks`, `textToEditorHtml`,
    `PLANTUML_SERVER`, `KROKI_SERVER`). Les types exportés sans lecteur externe sont laissés (dette 401).
  - **Code mort** : `setLocalEmbedding` (`render/space.ts`) supprimé ; `spatialFlag` supprimé (fonction, API des plugins
    et son test) ; `darken` et `roundedRectPath` gardés dans l'API des plugins avec un commentaire (briques offertes,
    documentées dans `AJOUTER_UNE_FORME.md`). `group.name = \`shape:${id}\`` retiré des neuf rendus, sans le reposer
    dans `createShapeObject` : il écraserait le nom donné par un rendu (lu par des tests de niveaux) ; aucun lecteur.
  - **Écart** : aucun dans l'appli (les objets de scène des formes n'ont plus de nom `shape:<id>`, que rien ne lisait).
    API de la bibliothèque : les 14 méthodes retirées ci-dessus (le CHANGELOG est généré par release-please : annonce par
    un pied `BREAKING CHANGE` du commit).
  - **Validation** : `make check` vert (152 fichiers, 2320 tests), `make lib` vert ; pas de vérification à l'œil (aucun
    rendu ni comportement de l'appli ne change), pas de fichier draw.io touché.
