# Triangles (vers la droite, vers le haut)

> Milestone 5 — Formes géométriques

- Style draw.io (palette) : `triangle;whiteSpace=wrap;html=1;`
- Taille : 60 × 80 (vers la droite)
- Géométrie 2D : triangle isocèle, base à gauche, pointe au milieu du bord droit (`direction=east`, défaut)
- Iso / 3D : prisme du contour
- Style draw.io (palette) : `triangle;whiteSpace=wrap;html=1;direction=north;`
- Taille : 80 × 60 (vers le haut)
- Géométrie 2D : le même tourné (`direction=north`) : base en bas, pointe en haut
- Iso / 3D : prisme du contour
- Nom de forme : `triangle`
- L'orientation est déjà validée sur la fixture (10 triangles au pixel près) ; reste la forme elle-même, son périmètre (`trianglePerimeter`) et la palette.

## Règles communes aux formes géométriques

- Forme **native de draw.io**, dessinée comme draw.io en 2D (même rendu à la réouverture dans draw.io), en volume en
  iso / 3D, créable depuis la palette avec le style et la taille par défaut de la palette draw.io. Guide :
  `docs/AJOUTER_UNE_FORME.md` (SPEC §8).
- À faire pour la forme : définition (`render/shapes/`), entrée de palette avec aperçu, périmètre de draw.io porté
  (accroche des flèches), tests (contour 2D, volume iso, clic, accroche des flèches), ajout à la fixture
  `tests/fixtures/shapes.drawio` avec ses variantes (directions, tailles, `size` / `dx`), comparaison avec l'export
  draw.io (`make drawio-check`, CLI `draw.io -x -f svg`).
- Volume : épaisseur par défaut (`view.isoDepth`, 32 px), `spatial.height` prioritaire, `spatial.elevation`,
  empilement sur le conteneur, repli à plat sans fond.
- Le nom de forme est celui de `resolveShapeKind` (alias dans `SHAPE_ALIASES` si draw.io écrit la même forme
  autrement).
- **Fini quand :** la forme s'affiche comme dans draw.io en 2D (comparaison avec l'export), en volume en iso et en 3D,
  se clique et reçoit les flèches sur son contour, se crée depuis la palette ; elle n'apparaît plus dans le panneau
  Diagnostics.
