# Étape 25 — Découpage en morceaux

> Milestone 6 — Moteur des flèches

- Préalable : tracé **aligné sur draw.io**. Les routeurs de draw.io sont portés tels quels (`route.ts`, mxGraph
  Apache 2.0 : orthogonal, segments, coudes, côte à côte, haut en bas, relation d'entités, boucle ; bouts fixes puis
  flottants) ; fixture `edge-routing.drawio` (144 tracés) exportée en SVG par draw.io (`make drawio-check`) : tous
  tombent au pixel près sur les nôtres (test `routingFixture`).
- **Orthogonale** : une poignée au milieu de chaque segment, glissée perpendiculairement ; le segment devient un point
  de passage, le reste reste automatique.
- **Droite / courbe** : points de passage déplaçables et poignées « fantômes » au milieu de chaque morceau (tirer =
  nouveau coude).
- Double-clic sur un coude : supprimé. Bouton **« Retour en auto »** : points de passage et attaches fixes effacés.
- **Fini quand :** on découpe une flèche en morceaux, on les déplace, on revient en auto, et draw.io affiche la même
  chose.
- Fait : `edit/edgePoints.ts` porte les éditeurs de draw.io (`mxEdgeSegmentHandler`, `mxElbowEdgeHandler`,
  `mxEdgeHandler`) : poignées de segments (orthogonal), de coude, de points et virtuelles (droit) ; point aligné ou
  lâché sur une poignée retiré, double-clic (point retiré, coude basculé), « Retour en auto » (`resetEdgeRoute`) ;
  `setEdgePoints` dans `format/edit.ts`. Testé à la main en 2D et en iso. Validé avec draw.io 24.7.5 : fixture
  `edge-points.drawio` (48 glisser écrits par `dragPoints`) exportée en SVG, tous les tracés identiques.
