# Sauts de ligne aux croisements des flèches

> Itération — rendu et format des flèches

- Quand une flèche passe au-dessus d'une autre (plus haut dans l'ordre de dessin), son rendu au croisement suit
  son style `jumpStyle` comme draw.io : `none` (défaut, rien), `arc` (demi-cercle), `gap` (trait interrompu),
  `sharp` (marche carrée), `line` (interruption bordée de deux petits traits). Taille du saut : `jumpSize` en pt
  (défaut draw.io 6).
- Seule la flèche du dessus saute ; pas de saut près des bouts ni d'un coude, deux croisements trop proches sont
  fusionnés ; pas de saut pour une flèche courbe (`curved=1`, comme draw.io).
- Panneau de la flèche, section « Tracé » : choix du saut (Aucun, Arc, Coupure, Marche, Ligne) et taille en pt ;
  écrit `jumpStyle` / `jumpSize` (retirés à « Aucun » / 6). Les sauts suivent le déplacement des flèches et des formes.
- **Fini quand :** deux flèches croisées, celle du dessus en `jumpStyle=arc` fait un arc au croisement, de taille
  réglable, et le fichier s'ouvre avec le même rendu dans draw.io ; `make check` vert.
- Fait : `src/engine/render/edges/jumps.ts` (`withJumps`) reprend le code de draw.io (`updateLineJumps`, `paintLine`) :
  demi-longueur `(jumpSize − 2) / 2 + strokeWidth`, saut vers le haut (vers la droite sur un segment vertical), arc
  en Bézier cubique (contrôles à 1,3 ×), `sharp` en marche carrée, `line` en coupure bordée de deux traits ; les
  croisements sont pris sur les tracés bruts des flèches dessinées avant (hors `noJump=1`). `createEdge` reçoit ces
  tracés (`buildPageScene` les accumule dans l'ordre de dessin) et dessine un trait par morceau ; `Engine.retraceEdges`
  retrace aussi les flèches à sauts au-dessus d'une flèche modifiée ou déplacée (`routesBelow`). Panneau « Tracé » :
  « Croisements » (désactivé pour une flèche courbe) et « Taille du saut (pt) ». Fixture
  `tests/fixtures/line-jumps.drawio` (ajoutée à `DRAWIO_SVG`, export de draw.io dans `drawio-saved/`) ; tests
  `tests/engine/render/edges/jumps.test.ts`, dont la comparaison point à point avec l'export SVG de draw.io. Vérifié
  dans l'appli : les cinq rendus, la taille 16, le passage Arc → Marche 12 pt, les sauts qui suivent une ligne
  déplacée au clavier.
