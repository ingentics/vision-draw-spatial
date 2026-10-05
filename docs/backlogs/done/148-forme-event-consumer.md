# Event consumer

> Milestone 5 — Formes ; palette Architecture ; dessin intérieur des stencils introduit ici (repris par 149, 150)

- Pas de forme native dans draw.io : **stencil embarqué** (`shape=stencil(…)`, `<shape name="event-consumer">`),
  comme la Prise (55). Cadre du stencil 120 × 60, `aspect="variable"` :
  - corps : rectangle de x 40 à 120 sur toute la hauteur (le fond, le contour de la forme) ;
  - enveloppe à gauche : rectangle de x 0 à 24, y 22 à 38, rempli, et son rabat (0,22) ► (12,31) ► (24,22) ;
  - flèche de l'enveloppe vers le corps : trait (24,30) ► (40,30), pointe ouverte (34,26) ► (40,30) ► (34,34).
- Dessin intérieur des stencils (avant-plan : traits et parties remplies, couleur et épaisseur de la bordure,
  pointillés compris) : une brique commune aux formes stencil, tirée des mêmes points que le XML du stencil.
- **Style** (palette) : `shape=stencil(…);whiteSpace=wrap;html=1;spacingLeft=40;` (texte centré sur le corps), 120 × 60.
- **Iso / 3D** : prisme du corps ; enveloppe et flèche restent au sol devant lui. Se clique sur toutes ses bornes ;
  flèches sur les bornes (périmètre rectangle, comme draw.io).
- **Palette** : catégorie Architecture, nom « Event consumer », mots-clés event, événement, consumer, consommateur,
  listener, subscriber, message.
- **Fini quand :** la forme se crée depuis la palette, s'affiche en 2D et en volume ; dans `shapes.drawio`, contour
  et dessin intérieur (directions, retournements) tombent sur l'export SVG de draw.io (`make drawio-check`) ;
  `make check` vert.
- Fait : base `shapes/generic/stencil/index.ts` (`stencilBox` : XML du stencil et rendu tirés des mêmes points,
  avant-plan `<stroke/>` / `<fillstroke/>` ; la Prise la reprend, XML inchangé) ; forme
  `shapes/impl/architecture/event-consumer/index.ts`. Fixture `shapes.drawio` : 10 orientations ; `make
  drawio-check` : contour et avant-plan tombent sur l'export SVG de draw.io. Vérifié dans l'appli : ajout depuis la
  palette, 2D, iso (enveloppe et flèche au sol devant le bloc).
