# Briques communes : `oneLine`, `JSON_FORMAT`, `spatialValue`, règles de calque, couleurs

> Audit 542 — tronc et modes (reprise de 518, 523, 529, 530, 534, 541)

- Constats :
  - `oneLine` en trois copies qui divergent : `storytelling/stories.ts:41`, `eventstorming/export/json.ts:46`
    (`\s*\n\s*`), `states/simulation/simulationView.ts:93` (`\s+`) ; variantes en ligne `warningHints.ts:15`,
    `pivotVerdict.ts:49`.
  - `{ id: 'json', name: 'JSON' }` recopié (`eventstorming/export/json.ts:119`, `storytelling/export/json.ts:39`) ;
    `PLANTUML_FORMAT` existe (`core/export/plantumlText.ts:7`).
  - `spatialOf` (`core/shapes/library/libraryStore.ts:63-66`) refait `spatialValue` (`core/spatial.ts:81`).
  - `core/format/layerTree.ts` (`rootIdsOf`, `layerIdsOf`, `layerOfCell`) redit `cellIndex.ts:64-110` (`rootIds`,
    `isLayer`, `layerOf`) ; remontée des parents avec `seen` deux fois (`layerEdits.ts:87-94`, `layerTree.ts:24-28`) ;
    `layerChildIds` (`layerTree.ts:42`) sans appelant.
  - Couleurs `#eef2f7` / `#5b7db1` dans `plugins/shapes/generic/library/unloadedShape.ts:29-30` et
    `settings/schema/shapes.ts:45-46` ; la mini-carte prend `UNLOADED_STROKE` en dur (l.178).
  - `src/app/demoShapeLibrary.ts:10-11` écrit le format et la version au lieu de `SHAPE_LIBRARY_FORMAT` / `_VERSION`.
  - `.find((x) => x.id === …)` au lieu de `byId` (`stories.ts:150`, `metamorphs.ts:139`).
- Ce qu'on veut : un `oneLine` (et un `JSON_FORMAT`) dans le tronc, offerts par l'API des plugins, repris par les trois
  modes (règle choisie : `\s+`, à vérifier sur les exports) ; `spatialValue` acceptant style et attributs absents ;
  une seule définition des racines et calques d'un arbre (`cellIndex` ou `layerTree`, l'autre l'appelle) ; couleurs
  par défaut lues du schéma des réglages ; constantes du format dans la démo ; `layerChildIds` retiré.
- Écart de comportement : aucun, sauf le contour de la forme non chargée sur la mini-carte qui suit le réglage.
- Tests : tests existants intacts (imports seuls) ; test de `oneLine` dans le tronc.
- **Fini quand :** les copies ont disparu ; exports JSON et PlantUML identiques sur les fixtures des trois modes ;
  `make check` vert.
