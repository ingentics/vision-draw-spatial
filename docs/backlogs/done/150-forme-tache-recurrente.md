# Tâche récurrente

> Milestone 5 — Formes ; palette Architecture ; dessin intérieur des stencils (148)

- Stencil embarqué `<shape name="recurring-task">`, cadre 120 × 60, `aspect="variable"` : rectangle sur tout le
  cadre ; dans le coin haut droit, une flèche circulaire ↻ (arc de rayon 7 centré en (104,14), sens horaire,
  ouvert en haut, pointe ouverte au bout). Le dessin s'étire avec la forme, comme dans draw.io.
- **Style** (palette) : `shape=stencil(…);whiteSpace=wrap;html=1;`, 120 × 60.
- **Iso / 3D** : prisme du rectangle, flèche tracée sur le dessus.
- **Palette** : catégorie Architecture, nom « Tâche récurrente », mots-clés tâche, récurrente, recurring, cron,
  planifiée, scheduled, batch, périodique.
- **Fini quand :** la forme se crée depuis la palette, s'affiche en 2D et en volume ; dans `shapes.drawio`, contour
  et flèche tombent sur l'export SVG de draw.io (`make drawio-check`) ; `make check` vert.
- Fait : `shapes/impl/architecture/recurring-task/index.ts` sur `generic/stencil` (arc de 290° en 24 segments,
  pointe tangente au bout). Fixture `shapes.drawio` : 10 orientations ; `make drawio-check` : contour et flèche
  tombent sur l'export SVG de draw.io. Vérifié dans l'appli : ajout depuis la palette, 2D, iso (flèche sur le dessus).
