# Parallélogramme (Parallelogram)

> Milestone 5 — Formes géométriques

- Style draw.io (palette) : `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;`
- Taille : 120 × 60
- Géométrie 2D : côtés obliques décalés de `size` (px avec `fixedSize=1`, défaut 20)
- Iso / 3D : prisme du contour
- Forme : `impl/geometry/parallelogram/`, `id: 'parallelogram'` (nom draw.io identique) ;
  « Parallélogramme » dans la palette.

## Règles communes aux formes géométriques

- Forme **native de draw.io**, dessinée comme draw.io en 2D (même rendu à la réouverture dans draw.io), en volume en
  iso / 3D, créable depuis la palette avec le style et la taille par défaut de la palette draw.io. Guide :
  `docs/AJOUTER_UNE_FORME.md` (SPEC §8).
- **Dossier** `src/engine/shapes/impl/geometry/<id>/` (`index.ts` exporte `definition`), nommé comme dans l'interface,
  en anglais ; `kinds` = nom de forme draw.io quand il diffère de l'`id`. Tout ce qui est propre à la forme vit dans
  son dossier ; elle étend `generic/box` (contour → rendu 2D + prisme iso). Catégorie de palette `geometry`
  (« Géométrie », existe depuis 68), à côté du rectangle, de l'ellipse et du losange.
- À faire pour la forme : définition (`id`, `kinds`, contour, `palette` avec icône ; clic par le contour, repli par
  défaut), périmètre de draw.io porté (`perimeterKind`, accroche des flèches), tests (contour 2D, volume iso, clic,
  accroche des flèches ; dans le dossier de la forme ou `tests/engine/shapes/`), ajout à la fixture
  `tests/fixtures/shapes.drawio` avec ses variantes (directions, tailles, `size` / `dx`), comparaison avec l'export
  draw.io (`make drawio-check`, CLI `draw.io -x -f svg`).
- Volume : épaisseur par défaut (`view.isoDepth`, 32 px), `spatial.height` prioritaire, `spatial.elevation`,
  empilement sur le conteneur, repli à plat sans fond.
- **Fini quand :** la forme s'affiche comme dans draw.io en 2D (comparaison avec l'export), en volume en iso et en 3D,
  se clique et reçoit les flèches sur son contour, se crée depuis la palette (catégorie « Géométrie ») ; elle
  n'apparaît plus dans le panneau Diagnostics ; `spatial.kind=<id>` la dessine.
