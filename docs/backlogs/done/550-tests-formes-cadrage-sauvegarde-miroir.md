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
- Fait :
  - `geometry.test.ts` : rectangles empilés (escalier, `dx` plafonné au quart du petit côté, texte dans le rectangle
    de devant) et bouclier (haut de 10 et pointe de 50 fixes, réduits ensemble, zone du texte).
  - `core/domains/view/camera.test.ts` : `keepInView` (forme dans la vue, `whole` avec une voisine hors de la vue,
    forme sortie, forme inconnue).
  - `file.test.ts` : enregistrement de deux pages, l'une compressée en mode, l'autre sans mode : labels du mode sur la
    première seule, arbre remis, second enregistrement identique.
  - `eventstorming/index.test.ts` : post-it avec titre de groupe et pastille (habillage des deux, `parts.bounds` de
    chaque partie).
  - Tests rangés comme `src/` : `modes/storytelling.test.ts` → `modes/storytelling/index.test.ts` ;
    `shapes/metamorph.test.ts` → `shapes/general/metamorph/blob.test.ts` ; la partie `StorySimulator` de
    `storyPlayback.test.ts` → `storySimulator.test.ts`.
  - Écart de comportement : aucun (tests seuls). Vérifié par `make check`.
