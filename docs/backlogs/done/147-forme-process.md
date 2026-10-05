# Process

> Milestone 5 — Formes ; palette Architecture

- Forme native de draw.io (« Process » de la palette Général de draw.io) :
  `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;`, 120 × 60. Rectangle avec deux barres verticales sur
  toute la hauteur, à `round(size × largeur)` des bords (`size` = 0,1 par défaut ; en px avec `fixedSize=1`, au plus
  la largeur). Avec `rounded=1`, rectangle arrondi et barres au moins à `min(l, h) × arcSize / 100` des bords
  (`arcSize` 15 par défaut), comme `ProcessShape.paintForeground` de draw.io. Orienté par `direction` (barres
  horizontales en `north` / `south`).
- **Zone de texte** en 2D, comme `ProcessShape.getLabelBounds` : entre les barres (`round(size × largeur)` de chaque
  côté) quand le texte est dans le sens de la forme ; les bornes sinon. En iso / 3D, le dessus entier.
- **Iso / 3D** : prisme du contour, barres tracées sur le dessus.
- **Palette** : catégorie Architecture, nom « Process », mots-clés process, processus, service, traitement, job.
  Case « Coins arrondis » dans le panneau.
- **Fini quand :** le process se crée depuis la palette, s'affiche en 2D (barres, texte entre les barres) et en
  volume (barres sur le dessus) ; dans `shapes.drawio`, contour et barres (tailles, `size`, `fixedSize`, `rounded`,
  directions) tombent sur l'export SVG de draw.io (`make drawio-check`) ; `make check` vert.
- Fait : `shapes/impl/architecture/process/index.ts` (barres orientées par `orientedPath`, zone de texte de
  `ProcessShape.getLabelBounds`, case « Coins arrondis ») ; la boîte générique (`generic/box`) prend un dessin
  intérieur (`details` : 2D, dessus du bloc en iso, au sol avec `ground`) et une zone de texte 2D (`label`) ; le
  dessin intérieur est exposé par `ShapeDefinition.details`. Fixture `shapes.drawio` : 8 process (`size`,
  `fixedSize`, `rounded`, `arcSize`, directions, retournement) ; `make drawio-check` : les barres tombent sur l'export
  SVG de draw.io (nouveau test « dessin intérieur », helper `drawioSvgPaths`). SPEC §8.3 et guide
  `AJOUTER_UNE_FORME.md` mis à jour. Vérifié dans l'appli : ajout depuis la palette, 2D et iso (barres sur le dessus).
