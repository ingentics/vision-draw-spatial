# Forme « Rectangles empilés »

> Milestone 5 — Formes ; catégorie « Géométrie » de la palette

- **Forme** : `plugins/shapes/geometry/stacked-rectangles/`, nommée « Rectangles empilés » ; trois rectangles
  décalés en escalier : celui de devant en bas à gauche, les deux couches derrière décalées de `dx` vers la droite et
  vers le haut (capture de l'utilisateur).
- Style draw.io : `shape=mxgraph.basic.layered_rect;dx=5;outlineConnect=0;` (« Layered Rect » de la palette Basic
  de draw.io), relu aussi depuis un fichier draw.io.
- **Les couches ne s'étirent pas** : décalage de `dx` px entre deux couches (5 par défaut : premier et dernier rectangle à un carré de grille, 10 px) quelle que soit la taille, ramené au quart
  du plus petit côté si la forme est trop petite.
- Texte de la forme dans le rectangle de devant. Contour noir, fond blanc, comme le rectangle ; contour au sol
  (clic, flèches, mini-carte) = l'escalier des trois couches. Prisme du contour en iso / 3D, bords des couches sur
  le dessus.
- Palette « Géométrie », après le rectangle arrondi ; taille posée 120 × 80.
- Fixture `tests/fixtures/stacked-rectangles.drawio` : une forme normale, une très étirée, une petite.
- **Fini quand :** dans l'appli, poser la forme depuis « Géométrie » ; en la redimensionnant, les couches gardent un
  décalage de 5 (un carré entre le premier et le dernier) ; le texte s'écrit dans le rectangle de devant ; la fixture se lit en 2D, iso et 3D ; `make check`
  vert.
- Fait : forme `plugins/shapes/geometry/stacked-rectangles/` (`box` du contour en escalier, bords des deux couches de
  devant en détails, texte dans le rectangle de devant), reconnue par `mxgraph.basic.layered_rect`, `dx` à 5 par
  défaut (reprise demandée : un seul carré de grille entre le premier et le dernier rectangle). Fixture
  `tests/fixtures/stacked-rectangles.drawio` vérifiée à l'œil en 2D et en iso ; listes de `palette.test.ts` mises à
  jour ; SPEC §8.3. Glisser-déposer et redimensionnement vérifiés seulement par le test de la palette ; ouverture de
  l'export dans draw.io non vérifiée (`make drawio-check` non lancé).
