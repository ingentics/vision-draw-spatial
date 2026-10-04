# Polygones arrondis (`rounded=1`)

> Milestone 5 — Formes géométriques (reste de l'étape 21)

- `rounded=1` sur une forme polygonale (losange, triangle, hexagone…) : coins arrondis comme draw.io
  (`arcSize`), en 2D, sur le volume iso / 3D et la mini-carte.
- Pas une forme : une capacité de la base `generic/box` (contour polygonal aux coins arrondis selon `rounded` /
  `arcSize`), dont profitent toutes les formes qui l'étendent (`impl/general/diamond`, `impl/geometry/*`). Chaque
  forme concernée déclare le réglage « Coins arrondis » (`properties`, comme `impl/general/rectangle`).
- **Fini quand :** un losange arrondi s'affiche comme l'export draw.io (`make drawio-check`) ; la case « Coins
  arrondis » apparaît sur les formes polygonales.
