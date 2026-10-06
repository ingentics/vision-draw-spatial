# RDD : onglet de la région au plus près du nom, édition sur le nom

> Itération — mode RDD (région) ; reprise de 227

- L'onglet finit au plus près du nom : même marge des deux côtés du nom (6 px à gauche, 6 px à droite jusqu'au milieu
  du S) ; le nom est mesuré avec les polices du dessin une fois chargées (approximation avant, puis les scènes sont
  reconstruites).
- L'éditeur en place s'ouvre exactement sur le nom dessiné : même position (6 px du bord gauche de l'onglet, centré
  en hauteur), même taille ; le nom dessiné est masqué pendant la saisie.
- **Fini quand :** sur une région, l'écart entre le nom et le S vaut celui entre le bord gauche et le nom ; un
  double-clic sur l'onglet montre l'éditeur à la place exacte du nom ; `make check` vert.
- Fait : `tabText` / `tabRect` (`shapes/region/index.ts`) : nom à 6 px du bord gauche, haut de l'onglet arrêté pour que
  le milieu du S (10 px de large) soit à 6 px après le nom. Mesure immédiate partagée `render/textMeasure.ts`
  (approximation, puis celle des polices SDF : `TroikaTextFactory.measured`, posée par `EngineCore` qui reconstruit
  alors les scènes). Éditeur : `ShapeDefinition.editStyle` (aligné à gauche, centré, sans marge ; repris par
  `labelEditor.displayStyle`), `textZone` = place du nom, qui l'emporte sur la zone d'un label hors de la forme
  (`registry.textZone` : le `verticalLabelPosition=top` pour draw.io envoyait l'éditeur au-dessus de la région) ; nom
  dessiné masqué pendant la saisie (`labelCellId`). Tests `rdd.test.ts` (marges, zone et style de l'éditeur). SPEC
  §14.5. Vérifié dans l'appli : S au plus près du nom, double-clic sur l'onglet = éditeur à la place exacte du nom.
