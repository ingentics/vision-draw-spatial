# Lecture des valeurs de style unifiée

> Idée — dette technique du moteur (mutualisation)

- `render/styleValues.ts` (`styleNumber`, `styleFlag`, `styleColor`, `styleOpacity`, `fontStyleBits`…) sert bien
  au-delà du rendu : formes génériques et `impl/`, formes du mode RDD (`modes/rdd`), et l'app.
- Il reste contourné : 7 `parseFloat(style.x ?? '')` hors du fichier (`core/selection/highlight`,
  `edit/edgeEnds`, `render/edges/edge`, `render/edges/route/terminals`, `render/geometry/paths`) et une quarantaine
  de `style.x === '1'` (surtout `render/edges`, `format`, `core/edit/text`, formes `generic/` et `impl/`) au lieu de
  `styleFlag`.
- Le déplacer vers le modèle (ou à côté de `format/style.ts`, qui n'exporte que `parseStyle` et
  `resolveShapeKind`) et l'utiliser partout ; `styleColor` dépend de `three`, à garder côté rendu si on veut un
  modèle sans `three`.
