# Briques géométriques et accès par id : fin des calculs écrits à la main dans le tronc

> Architecture du moteur — mutualisation (`coding.md` §4) ; suite de 291, 307, 325 (qui ont traité les plugins).
> Audit du 2026-10-08 (`AUDIT.md`). Remplacements mécaniques, peut être découpé.

| Brique (dans `core/model/`) | Sites à remplacer |
|---|---|
| `shapeOf(page, id?)`, `edgeOf(page, id?)`, `elementOf(page, id?)`, `edgesById(page)` (`pageIndex.ts`, exportés par l'API) | ≈ 78 `.shapes/.edges.find((x) => x.id === …)` (ex. `domains/edit/drag/*`, `pageModes.ts:75,264,405,287`, `shapeParts.ts` ×5, `links.ts:54`, `properties.ts:16,31`, `textEdits.ts:13,33`, `labelEditor.ts:94`, `rdd/regions/regionLayout.ts:174-277` ×5, `rdd/editing/fieldParts.ts:53`) ; tables de flèches `commands/styles.ts:60`, `rdd/relations/relationKinds.ts:131`, `relationFields.ts:88`, `sequences/export/plantuml.ts:41` |
| `snapToGrid(v, grid)`, `snapPoint(p, grid)` (`geometry.ts`, à côté de `ceilToGrid`) | `drag/edgePoints.ts:21-22`, `edges/anchors.ts:85-86`, `edit/handleKinds.ts:106-107`, `edit/palette.ts:24-25`, `edit/moveSet.ts:151-152` |
| `segmentProjection(p, a, b): { t, point }` | `geometry.ts:114-119`, `selection/picking.ts:111-121`, `render/edges/polyline.ts:126-133` |
| `fitScale(content, available, fallback)` ; `center()` partout | `interaction/cameraMath.ts:191-195`, `transitionMath.ts:41-44`, `minimapLayout.ts:35-38` ; centres à la main `cameraMath.ts:181`, `transitionMath.ts:46-47`, `minimapLayout.ts:41-42`, `graph/graphPage.ts:239-240`, `drag/connect.ts:94`, `text/labelEditor.ts:267` |
| `rectCorners(rect)` (et `rectPath` déplacé de rendu vers `geometry.ts`) ; `boundsOfPoints` | `picking.ts:93-98,141-146,233-238,245-249`, `labelEditor.ts:285-289,336-339`, `cameraMath.ts:219-224`, `marquee.ts:34-39` |
| `unit(v)` (déplacé de `render/edges/polyline.ts:11`), `samePoints`, `sameRect` | `iso/block.ts:126,221`, `controls/motion.ts:93`, `graphPage.ts:243` ; `domains/edit/helpers.ts` (`samePoints`), `variants.ts:33`, `labelEditor.ts:362` |
| `distance` | `cameraMath.ts:279`, `edit/obstacles.ts:42`, `pcb/octilinear.ts:201`, `edges/anchors.ts:76,127`, `edgeHandles.ts:32,84`, `shapeHandles.ts:30`, `modeHandles.ts:39`, `curly-bracket-left/index.ts:28` (et `distance` exporté par l'API des plugins) |
| `clamp` (existe, `model/numbers.ts`) | `settings/pluginSettings.ts:58`, `settings/fields.ts:50`, `drag/label.ts:24`, `view/levels.ts:63`, `render/grid.ts:106`, `iso/block.ts:152`, `geometry/paths.ts:78` ×2, `edges/polyline.ts:132`, `edges/split.ts:62`, `cameraMath.ts:87-92,109`, `minimapLayout.ts:34` |
| `unionOf` (existe) | `graphPage.ts:246-253` (`unionBounds`) |

- Écart possible : `clamp` fait gagner le minimum si les bornes sont inversées, les sites écrits `min(max, max(min,
  v))` faisaient gagner le maximum. Vérifier que `min ≤ max` est garanti à chaque site remplacé (`cameraMath` surtout),
  sinon le laisser et le dire en commentaire.
- Code porté de mxGraph (`render/edges/route/`) exclu.
- Tests : chaque brique nouvelle au chemin miroir ; existants intacts sauf imports.
- **Fini quand :** les recherches `Math.hypot(.*\.x - `, `Math.round(.* / step) \* step`, `\.find\(\(\w\) => \w\.id ===`,
  `Math.max(.*Math.min(` ne trouvent plus de site dans `src/engine` hors code porté (ou un commentaire dit pourquoi) ;
  rendu et édition identiques à l'œil (formes, flèches, mini-carte, RDD) ; `make check` vert.
