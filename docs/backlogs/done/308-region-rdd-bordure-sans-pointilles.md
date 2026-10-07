# La bordure d'une région RDD ignore les pointillés

> Dette relevée par l'audit du moteur (2026-10-07), avec le sujet 307

- La région RDD dessinait sa bordure sans `dashPattern` (`plugins/modes/rdd/shapes/region/index.ts`) : `dashed=1`
  donnait un trait plein, alors que draw.io dessine le rectangle en pointillé.
- **Fini quand :** une région `dashed=1` (et `dashPattern`, `strokeWidth`) est en pointillé dans l'appli comme dans
  draw.io ; une région `strokeWidth=0` n'a pas de bordure.
- Fait :
  - `region/index.ts` : bordure tracée avec `dashPattern(style, width)`, comme les autres formes ; aucune bordure si
    l'épaisseur est nulle.
  - Test : `tests/engine/plugins/modes/rdd/shapes/region.test.ts` (pointillé découpé en tirets, pas de bordure à
    `strokeWidth=0`) ; il échouait avant la correction.
  - Fixture `tests/fixtures/rdd-region-pointillee.drawio` (trait plein, `dashed=1`, `dashPattern=8 4;strokeWidth=2`),
    réenregistrée par `make drawio-check` (attributs conservés).
  - Vérifié à l'œil dans l'appli, comparé à l'export PNG de draw.io : mêmes pointillés.
