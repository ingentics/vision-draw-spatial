# Choix des bouts de flèche et inversion

> Itération — format des flèches (panneau de droite)

- Section « Bouts » du panneau d'une flèche (et d'une sélection de flèches) : forme du début (`startArrow`) et de
  la fin (`endArrow`) parmi celles que l'appli dessine (aucune, classique, ouverte, bloc, losange, ovale…), pleine
  ou vide (`startFill` / `endFill`) quand la forme le permet. Valeurs et défauts de draw.io : `endArrow=classic`,
  `startArrow=none`.
- Bouton « Inverser » : comme « Inverser » de draw.io, la flèche part de son ancienne cible et va vers son ancienne
  source (`source` ↔ `target`, points libres et points intermédiaires inversés, points d'attache `exit…` ↔
  `entry…`) ; les bouts restent à leur place sur la flèche, la pointe change donc de côté.
- **Fini quand :** on change la pointe d'une flèche en losange vide et son départ en ovale ; « Inverser » retourne la
  pointe vers l'autre forme sans changer le tracé ; le fichier s'ouvre pareil dans draw.io ; `make check` vert.
- Fait : section « Bouts » (`EdgeEndsSection`, panneau de la flèche et sélection de flèches) : liste des bouts
  dessinés, case « pleine » (`startFill` / `endFill` à 0 quand décochée), « Inverser ». `reverseEdgeCell`
  (`src/engine/format/edit.ts`) reprend `Graph.turnShapes` de draw.io : `source` ↔ `target`, coordonnées des points
  libres et intermédiaires inversées sans déplacer les nœuds, `exit…` ↔ `entry…`, espacements échangés ;
  `Engine.reverseEdges`. Tests `tests/engine/format/reverse.test.ts`. Vérifié dans l'appli : début Rond, fin Losange
  vide, puis « Inverser » : même tracé, bouts échangés de côté.
