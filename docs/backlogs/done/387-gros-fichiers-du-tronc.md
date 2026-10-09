# Gros fichiers et longues fonctions du tronc : découper par sujet

> Architecture du moteur — lisibilité (`coding.md` §6, ~400 lignes). Audit du 2026-10-08 (`AUDIT.md`). Priorité basse.

- `core/interaction/cameraMath.ts` (628 lignes, 28 importeurs) : état et bornes (`4-160`), cadrage (`164-327`),
  application à une caméra Three.js (`357-437`), projection (`441-515`), mouvements (`524-628`) → `cameraState.ts`,
  `cameraFraming.ts`, `cameraProjection.ts`, `cameraMoves.ts` (noms à vérifier) ; la conversion réglages → bornes de
  `domains/view/camera.ts:40-56` devient la fonction pure `cameraLimitsOf`.
- `core/format/parse.ts` : `parseGraphModel` (`176-362`, huit fermetures) → un index des cellules (calques, emprises
  absolues) extrait ; sortie identique.
- `core/graph/graphPage.ts` : `buildGraphPage` (`110-235`) découpée (nœuds, liens, cadrage).
- `core/render/edges/edge.ts` : `createEdge` (`41-148`) ; `core/render/troikaText.ts:75` (fabrique de 206 lignes).
- Écart : aucun ; tests intacts sauf imports.
- **Fini quand :** plus aucune fonction du tronc > ~80 lignes hors code porté ; vues, transitions, mini-carte et vue
  graphe identiques à l'œil ; `make check` vert.
- Fait : refactor sans écart de comportement ; plus aucune fonction du tronc au-delà de ~80 lignes hors code porté
  (mesuré par script sur l'AST : la plus longue est `routeAround`, 76 lignes ; restent au-delà `orthConnector` et
  `segmentConnector`, portés de mxGraph dans `render/edges/route/`, exclus).
  - `interaction/cameraMath.ts` (628 lignes) supprimé, découpé en `cameraState.ts` (modes, bornes, normalisation,
    `withViewMode`, nouvelle fonction pure `cameraLimitsOf` reprise du getter `ViewCamera.limits`), `cameraProjection.ts`
    (écran ↔ page, application à une caméra Three.js), `cameraFraming.ts` (`fitBounds`, `defaultView`, `sameView`,
    cycle Entrée), `cameraMoves.ts` (glisser, zoom, rotation, orbite, `interpolateCamera`). `clampZoom`, `clampTilt`,
    `screenAxes`, `verticalScale` exportés entre ces fichiers. Les 34 importeurs (src et tests) importent directement
    le bon fichier (pas de baril, comme ailleurs dans le moteur). Le test reste `tests/engine/core/interaction/cameraMath.test.ts`
    (organisé par thème à cheval sur les quatre fichiers), imports seuls modifiés, plus un test de `cameraLimitsOf`.
  - `format/parse.ts` : `parseGraphModel` (184 lignes, huit fermetures) → `format/cellIndex.ts` (classe `CellIndex` :
    lecture des cellules brutes, doublons, calques, `layerOf`, `absoluteBounds`, `parentVertexBounds`, avertissements
    au même moment) et, dans `parse.ts`, `elementBase`, `readEdge`, `edgeLabelOf`, `labelOf`, `richOf`, `linkOf`.
    Test `tests/engine/core/format/cellIndex.test.ts` (calques, calque d'une cellule, emprises relatives, doublon, parent
    introuvable, cycle).
  - `graph/graphPage.ts` : `buildGraphPage` → `statusOf`, `nodeShapes`, `linkEdges` ; ordre d'empilement inchangé.
  - `render/edges/edge.ts` : `createEdge` → `drawnLine` (courbe / coudes arrondis, écrit une seule fois au lieu de
    deux), `edgeMarkers`, `addEdgeStroke`.
  - `render/troikaText.ts` : la fabrique de 206 lignes devient la classe `TroikaTextFactory` (méthodes `create`,
    `sdfText`, `layeredText`, `addPieces`, `createOnPath`, `createRich`) plus `richLayoutOf` ; `createTroikaTextFactory`
    garde sa signature.
  - Aussi au-delà de 80 lignes, hors liste initiale : `interaction/controls/keyboard.ts` `onKeyDown` (129) →
    `trackHeldKeys`, `runSelectionKey`, `runEditKey`, `runViewKey`, `startMotion` ; `domains/navigation/transition.ts`
    `runTransition` (102) → `play`, `arrive`, `finish` ; `domains/edit/drag/connect.ts` `follow` (93) →
    `followDistributed`, `followFree`, `showPreview` ; `domains/edit/drag/gesture.ts` `beginMove` (84) → `handleDrag`,
    `shapeDrag` ; `edit/anchoring/pcb/octilinear.ts` `routeOctilinear` (201) → classes `OctilinearGrid` et
    `OctilinearSearch` ; `edit/anchoring/auto/routeAround.ts` → `sparseGrid`, `stepCost` ; `auto/avoid.ts` →
    `routingJobs` ; `auto/distribute.ts` → `slotOf`, `keptPoint`.
  - Docs : SUMMARY §5, SPEC §4.3 et §13 (la ligne des bornes de caméra citait encore `setCameraLimits`, retiré :
    corrigée), `coding.md` §2 (exemple de nom).
  - Validation : tests seulement (`make check` vert, aucune vérification à l'œil faite). Comparaison jetable ancien /
    nouveau code (retirée) : `routeOctilinear` et `routeAround` sur 400 cas aléatoires, `avoidRoutes` (orthogonal et
    Typon) et `distributeAnchors` sur les pages de six fixtures avec deux graines, `documentFromTree` et
    `buildGraphPage` sur toutes les fixtures (JSON identique, avertissements compris).
  - Dette notée : 403 (longues fonctions des plugins `createTable`, `standingActor`).
