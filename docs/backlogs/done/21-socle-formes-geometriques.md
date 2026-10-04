# Étape 21 — Socle commun des formes géométriques (avec le Losange)

> Milestone 5 — Formes géométriques

Prérequis aux formes polygonales (rectangle et ellipse étaient seuls gérés hors du rendu).

- **Contour polygonal** par forme (`outline`), utilisé partout : rendu 2D (`flatBox`), volume iso (`isoBlock` : prisme
  du contour, toit avec le label, arêtes verticales aux angles vifs, rentrants compris), mini-carte (repli contour).
- **Clic et survol sur le contour réel** (point dans le polygone) au lieu des bornes (`shapeContains`) : les coins
  vides d'un losange ou d'une étoile ne sont pas cliquables.
- **Accroche des flèches sur le contour**.
- **`direction`** draw.io (`east` par défaut, `south`, `west`, `north`) générique pour toutes les formes polygonales ;
  `flipH` / `flipV`.
- Fixture `tests/fixtures/shapes.drawio` exportée par draw.io ; `make drawio-check`.
- Fait, avec le Losange (`rhombus;whiteSpace=wrap;html=1;`, 80 × 80) comme première forme :
  - orientation commune `render/geometry/orient.ts` (portée de draw.io : cadre couché pour north / south, rotation,
    `flipH` / `flipV`, **échangés** par draw.io pour un cadre couché) ;
  - clic sur le contour réel (`shapeContains` + `outlineOf`, contour de la définition mis en cache) ;
  - **périmètres de draw.io** plutôt qu'un polygone générique : `perimeter=…`, sinon celui du style nommé
    (`ellipse`, `rhombus`, `triangle` dans la feuille de style de draw.io), sinon rectangle ; `rhombusPerimeter`
    porté. Conséquence fidèle : `shape=ellipse` sans le style nommé `ellipse;` s'accroche sur son rectangle, comme
    dans draw.io ;
  - fixture `shapes.drawio` exportée en SVG par draw.io (`make drawio-check`) : 32 losanges (3 tailles, directions,
    retournements) et 10 triangles (orientation sur une forme asymétrique) au pixel près, 16 flèches (droites et
    orthogonales) accrochées au losange comme dans draw.io.
- Reste, déplacé dans `todo/` : labels hors de la forme (31), formes arrondies (32), périmètres des formes suivantes
  (avec chaque forme).
