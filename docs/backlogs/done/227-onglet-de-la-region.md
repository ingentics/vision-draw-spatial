# RDD : la région porte son nom sur un onglet

> Itération — mode RDD (région) ; reprise de 226

- Le nom de la région passe sur un **onglet** posé au-dessus de son bord haut, à gauche (hors de la zone) : coin
  haut-gauche carré, bord gauche dans le prolongement de celui de la région ; le haut file jusqu'après le texte puis
  redescend en **S** jusqu'au bord haut de la région. L'onglet a le **fond et la bordure de la région**, d'un seul
  contour avec elle ; texte en gras de 9 px, noir ou blanc selon le contraste avec ce fond ; largeur ajustée au nom ;
  pas d'onglet sans nom.
- L'onglet se clique comme la région (sélection, déplacement) et le double-clic y édite le nom.
- Dans draw.io : le label est posé au-dessus de la région à gauche (`verticalLabelPosition=top;verticalAlign=bottom`)
  dans un cadre de la couleur de la bordure (`labelBorderColor`, plus de `labelBackgroundColor`).
- **Fini quand :** une région neuve montre son nom sur un onglet au-dessus de son coin haut-gauche, terminé par un S ;
  cliquer l'onglet sélectionne la région ; draw.io montre le nom au-dessus de la région ; `make check` vert.
- Fait : rendu propre à la région (`shapes/region/index.ts`) : `tabRect` (largeur du nom mesurée sans police, gras
  9 px, 6 px de marge de chaque côté, 16 px de haut), `tabPath` (S en courbe de Bézier à tangentes horizontales,
  12 px de large), `regionOutline` (onglet et rectangle d'un seul contour, rempli du fond à 10 % et bordé de
  `strokeColor`) ; nom noir ou blanc selon le fond posé sur du blanc (`regionTextColor`). Prise au clic hors des
  bornes : `ShapeDefinition.hitBounds` (registre, `pickElement`), `contains` limité au contour (pas la bande à droite de
  l'onglet) ; éditeur en place sur l'onglet (`textZone`). draw.io : `verticalLabelPosition=top;verticalAlign=bottom`,
  `labelBorderColor` de la bordure (`setRegionColor` l'écrit et retire `labelBackgroundColor`). Tests `rdd.test.ts`
  (onglet, contour, S, clic), fixture `rdd.drawio` réenregistrée par draw.io. SPEC §14.5. Vérifié dans l'appli :
  onglets terminés en S sur les régions, un clic sur l'onglet sélectionne la région.
