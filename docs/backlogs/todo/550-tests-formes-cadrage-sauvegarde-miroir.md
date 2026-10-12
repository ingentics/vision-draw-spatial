# Tests : formes géométriques, cadrage de la simulation, sauvegarde à plusieurs pages, miroir

> Audit 542 — tests (reprise de 513, 514, 519, 521, 522, 527, 534, 539)

- Manquent :
  - `shield` (réduction de `heights()`, contour, zone du texte) et `stacked-rectangles` (`offset()` plafonné) dans
    `tests/engine/plugins/shapes/geometry.test.ts`, comme leurs voisines.
  - `camera.keepInView` avec `around` / `whole` (`core/domains/view/camera.ts:78`).
  - `DocumentFile.serialize` à plusieurs pages, dont une compressée et une sans mode : arbre remis, réencodage suivant.
  - Post-it portant titre de groupe et pastille : `parts.bounds` entre `BADGE_PART` et `GROUP_PART`
    (`eventstorming/index.ts:56-64`).
- Tests hors miroir de `src/` : `storytelling.test.ts` (pour `stories.ts`), `storyPlayback.test.ts` (pour
  `simulation/storySimulator.ts`), `shapes/metamorph.test.ts` (pour `metamorph/blob.ts`) : à déplacer.
- Écart de comportement : aucun (tests seuls).
- **Fini quand :** ces tests existent et passent ; `make check` vert.
