# Jumelles de la couleur de la bordure, titre de la vue à l'écart

> Itération — mode RDD (tables) ; reprise de 220

- Les jumelles de la vue prennent la **couleur de la bordure** de la forme (`strokeColor`, sinon le gris par défaut
  des tables), **à 100 %** (plus de transparence).
- La **zone du titre** de la vue ne recouvre plus les jumelles : elle est réduite de la place des jumelles (écart au
  bord, largeur, 4 px d'air) des deux côtés, pour que le nom reste centré ; un nom long passe à la ligne avant de les
  atteindre. L'éditeur en place suit la même zone.
- **Fini quand :** sur une vue, jumelles du gris de la bordure (ou de sa couleur si on la change), pleinement
  opaques ; un nom long ne les chevauche pas ; `make check` vert.
- Fait : `binoculars()` prend `strokeColor` (gris par défaut des tables, rien sans bordure), opacité 1 ;
  `nameZone(shape, kind)` réduit la zone du titre d'une vue de 7 + 14 + 4 = 25 px (× l'échelle) de chaque côté (label
  et éditeur en place). Tests `rdd.test.ts` (couleur et opacité, zone du titre de la vue et d'une entité) ; SPEC
  §14.5. Vérifié dans l'appli : jumelles grises opaques, cadre de l'éditeur en place arrêté avant elles. Un nom d'un
  seul mot plus long que la zone déborde encore (pas de coupure dans un mot, comme draw.io).
