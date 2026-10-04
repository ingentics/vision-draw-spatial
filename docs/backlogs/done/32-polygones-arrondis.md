# Polygones arrondis (`rounded=1`)

> Milestone 5 — Formes géométriques (reste de l'étape 21)

- `rounded=1` sur une forme polygonale (losange, triangle, hexagone…) : coins arrondis comme draw.io
  (`arcSize`), en 2D, sur le volume iso / 3D et la mini-carte.
- Pas une forme : une capacité de la base `generic/box` (contour polygonal aux coins arrondis selon `rounded` /
  `arcSize`), dont profitent toutes les formes qui l'étendent (`impl/geometry/diamond`, `impl/geometry/*`). Chaque
  forme concernée déclare le réglage « Coins arrondis » (`properties`, comme `impl/geometry/rectangle`).
- **Fini quand :** un losange arrondi s'affiche comme l'export draw.io (`make drawio-check`) ; la case « Coins
  arrondis » apparaît sur les formes polygonales.

Fait : `roundedPolygon` et `polygonArc` dans `render/geometry/paths.ts`, portés de `mxShape.addPoints` (départ au
milieu du dernier côté, arrêt à `arcSize / 2` px de chaque sommet, au plus la moitié du côté, courbe quadratique
dont le sommet est le point de contrôle, découpée en 8 segments). Option `roundable` de `generic/box` : avec
`rounded=1`, le contour arrondi sert au rendu 2D, au volume (sans arête verticale dans les courbes), au clic et à la
mini-carte, et la case « Coins arrondis » apparaît dans le panneau. Formes concernées, celles que draw.io arrondit :
losange, hexagone, triangles, parallélogramme, étape (pas l'octogone, le pentagone ni les étoiles). Fixture
`shapes.drawio` : 20 variantes arrondies (`arcSize` 20, 40, 300, orientées) identiques à l'export SVG de draw.io (la
lecture des contours SVG comprend les courbes `Q`, `tests/helpers.ts`) ; tests dans
`tests/engine/shapes/geometry.test.ts`. Vérifié dans l'appli : case cochée sur un losange.
