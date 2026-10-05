# Croisements des flèches : réglage de l'appli et de la page

> Itération — paramètres et panneau de la page ; suite de 129

- Cascade comme l'ancrage des flèches : une flèche sans `jumpStyle` suit sa page, une page sans `spatial.jumps`
  (attribut de `<diagram>`) suit le réglage de l'appli.
- Paramètres › Formes et flèches › Flèches : « Croisements des flèches » (Aucun, Arc, Coupure, Marche, Ligne ;
  défaut Aucun, comme draw.io) et « Taille du saut » (pt, défaut 6) pour les flèches sans `jumpSize`.
- Panneau de la page : « Croisements des flèches » = « Par défaut (…) » (réglage de l'appli) ou un choix propre.
- Panneau de la flèche : « Par défaut (…) » (celui de la page ; `jumpStyle` retiré) ou un choix propre (« Aucun »
  écrit `jumpStyle=none`). Les flèches créées n'ont pas de `jumpStyle` : elles suivent le défaut.
- draw.io ne connaît que le `jumpStyle` de la flèche : une flèche « par défaut » n'y saute pas.
- **Fini quand :** le réglage de l'appli sur Arc fait sauter toutes les flèches des pages « par défaut » ; une page
  réglée sur Aucun n'en fait plus ; une flèche réglée sur Coupure garde sa coupure ; `make check` vert.
- Fait : paramètres `shapes.edgeJumpStyle` / `shapes.edgeJumpSize` (section Flèches), attribut de page
  `spatial.jumps` (`Engine.jumpsOf`, `setPageJumps`), passés au rendu par `RenderContext.edgeJumps` ; `jumpStyleOf`
  / `jumpHalfLength` prennent ce défaut. Panneaux de la page et de la flèche avec « Par défaut (…) ». Tests : cascade
  dans `jumps.test.ts`, bornes dans `settings.test.ts`. Vérifié dans l'appli : réglage Arc → les flèches d'une page
  « par défaut » sautent ; page sur Aucun → plus de saut ; flèche sur Coupure → coupée.
