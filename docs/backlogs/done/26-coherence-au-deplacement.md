# Étape 26 — Cohérence au déplacement des formes

> Milestone 6 — Moteur des flèches

- Les attaches fixes suivent la forme ; les points de passage suivent la flèche si ses deux bouts bougent ensemble
  (déplacement d'un groupe ou d'une sélection), restent en place sinon (comme draw.io).
- **Fini quand :** déplacer formes et groupes garde des flèches cohérentes, identiques dans draw.io.
- Règle relevée dans draw.io 24.7.5 (`mxGraph.moveCells`, `resetEdgesOnMove=false`, `disconnectOnMove=true`) : une
  flèche non sélectionnée garde ses points (seuls ses bouts suivent les formes) ; une flèche dans un groupe déplacé le
  suit (géométrie relative) ; une flèche **sélectionnée** avec des formes bouge avec elles (points et bouts libres
  décalés, `moveEdgeCell`), un bout dont la forme ne bouge pas est détaché. Fait dans `Engine` (glisser `move`),
  testé à la main en 2D.
