# Zone de clic du texte qui suit la flèche

> Itération — interaction (sélection des textes de flèche)

- Le texte du milieu qui suit la flèche (`spatial.labelFollow=1`) n'est plus attrapé dans la boîte englobante de
  toutes ses lettres (grand rectangle quand il passe un coude), mais lettre par lettre : la boîte tournée de chaque
  lettre, avec la même marge de 2 px à l'écran. Les autres textes de flèche gardent leur boîte.
- **Fini quand :** sur une flèche en coude dont le texte suit le trait, un clic dans le coin vide du rectangle ne
  prend plus le texte, un clic sur les lettres le prend (sélection, double-clic d'édition, glisser) ; `make check` vert.
- Fait : `render/edges/edge.ts` marque le texte posé le long du trait (`userData.alongPath`) ; `edgeTextAt`
  (`Engine.ts`) le teste lettre par lettre (`drawnGlyphQuads` : coins tournés de chaque texte SDF, `nearPolygon` :
  dedans ou à moins de la marge du bord), les autres textes gardent leur boîte englobante. Vérifié dans l'appli sur
  `edge-points.drawio` : flèche en coude, texte qui suit le trait, un clic dans le coin vide de l'ancien rectangle ne
  prend plus rien, un clic sur les lettres sélectionne la flèche.
