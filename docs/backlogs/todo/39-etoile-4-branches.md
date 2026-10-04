# Étoile à 4 branches

> Milestone 5 — Formes géométriques

- Style draw.io (palette) : `html=1;shape=mxgraph.basic.4_point_star_2;dx=0.8;`
- Taille : 100 × 100
- Géométrie 2D : étoile à 4 pointes ; `dx` = creux des branches (0,8 par défaut)
- Iso / 3D : prisme du contour, arêtes verticales aux pointes et aux creux
- Nom de forme : `mxgraph.basic.4_point_star_2`
- Préfixe exact du style de la palette « Basic » à relever ; label éventuellement hors de la forme (31).

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
