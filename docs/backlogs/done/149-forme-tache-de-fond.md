# Tâche de fond

> Milestone 5 — Formes ; palette Architecture ; dessin intérieur des stencils (148)

- Stencil embarqué `<shape name="background-task">`, cadre 120 × 60, `aspect="variable"` : rectangle sur tout le
  cadre ; dans le coin haut droit, un engrenage tracé (8 dents, rayon 9 aux dents, 7 au creux, centre (104,14)) et
  son moyeu (cercle de rayon 3). Le dessin s'étire avec la forme, comme dans draw.io.
- **Style** (palette) : `shape=stencil(…);whiteSpace=wrap;html=1;`, 120 × 60.
- **Iso / 3D** : prisme du rectangle, engrenage tracé sur le dessus.
- **Palette** : catégorie Architecture, nom « Tâche de fond », mots-clés tâche, fond, background, worker, job,
  daemon, asynchrone, async.
- **Fini quand :** la forme se crée depuis la palette, s'affiche en 2D et en volume ; dans `shapes.drawio`, contour
  et engrenage tombent sur l'export SVG de draw.io (`make drawio-check`) ; `make check` vert.
- Fait : `shapes/impl/architecture/background-task/index.ts` sur `generic/stencil` (engrenage et moyeu calculés,
  arrondis au centième). Fixture `shapes.drawio` : 10 orientations ; `make drawio-check` : contour et engrenage tombent
  sur l'export SVG de draw.io. Vérifié dans l'appli : ajout depuis la palette, 2D, iso (engrenage sur le dessus).
