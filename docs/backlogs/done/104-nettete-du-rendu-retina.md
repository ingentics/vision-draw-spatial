# Netteté du rendu sur écran Retina

> Itération — rendu (canevas et texte)

- Sur Mac, le schéma (surtout le texte) paraît flou à côté de l'interface HTML. Mesuré : le canevas commence à
  y = 39,195 px CSS (78,39 px physiques) et mesure 695,61 px de haut pour un tampon de 1391 px ; le navigateur
  ré-échantillonne toute l'image pour la caler.
- Le tampon de rendu suit la taille exacte en pixels physiques (`devicePixelContentBoxSize` du ResizeObserver,
  sinon taille CSS × `devicePixelRatio` arrondie) et les changements de `devicePixelRatio` (fenêtre passée sur un
  autre écran, zoom du navigateur).
- La barre d'outils a une hauteur entière (interligne de 18 px au lieu de 18,2), pour que le canevas tombe sur un
  pixel physique entier.
- Texte SDF : glyphes à 128 px (`sdfGlyphSize`, 64 par défaut), bords plus nets en petite taille et en zoom.
- **Fini quand :** le canevas commence sur un pixel entier et son tampon a la taille de sa boîte en pixels
  physiques ; un texte posé sur une forme est visiblement plus net ; passer d'un écran à l'autre ou zoomer
  (⌘ + / ⌘ −) garde le rendu net ; `make check` vert.
- Fait : `Engine.ts` dimensionne le tampon avec `setDrawingBufferSize` à la taille physique de la boîte
  (`devicePixelContentBoxSize` observé, repli CSS × `devicePixelRatio` arrondi pour Safari) et suit le
  `devicePixelRatio` par `matchMedia('(resolution: …dppx)')`. `troikaText.ts` : `sdfGlyphSize` à 128 (déclaré dans
  `troika-three-text.d.ts`). `main.css` : interligne de 18 px pour la barre d'outils et la barre du bas. Vérifié dans
  l'appli (DPR 2) : canevas à y = 78 px physiques, boîte et tampon de 872 × 1392 px, et encore égaux après
  redimensionnement de la vue.
