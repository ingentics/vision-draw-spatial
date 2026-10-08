# Inverser une flèche garde son tracé

> Itération — panneau de contexte, bouton « Inverser » (reprise de 131).

- « Inverser » n'échange que le sens : la source devient la cible et la cible la source (important dans les
  diagrammes de séquence), les pointes se retrouvent de l'autre côté, mais **le tracé reste le même**.
- Bug : une flèche à angles droits dont les bouts sont flottants (sans point d'attache) change de chemin, le routeur
  dépendant du sens (A→B ≠ B→A).
- Correction : à l'inversion, si le tracé inversé diffère de l'ancien, chaque bout flottant est fixé (`exit…`,
  `entry…`) là où l'ancien tracé touchait sa forme.
- **Fini quand :** inverser une flèche à angles droits sans points d'attache laisse son tracé identique, seules les
  pointes changent de côté ; un test le vérifie.
- Fait : `reversalFix` (`core/edit/anchoring/reversal.ts`, pur) compare le tracé inversé à l'ancien ; s'ils diffèrent,
  `StyleCommands.reverseEdges` écrit la correction : bouts flottants rattachés à une forme fixés (`exit…`/`entry…`
  via `constraintStyle`) là où l'ancien tracé touchait la forme ; si cela ne suffit pas (bouts libres sans point),
  coude de l'ancien tracé écrit en point intermédiaire (`setEdgePoints`, ramené au pixel : le routeur décale de
  0,5 px le coude d'une flèche à bouts libres sans point). Rien n'est écrit si le tracé est déjà le même (points
  d'attache posés, points intermédiaires, flèche droite).
  Comportement : un fichier enregistré après inversion peut contenir ces points d'attache ou ce point (draw.io
  laisse le tracé changer). Infobulle du bouton reformulée. Tests : `reverse.test.ts` (deux formes, bouts libres,
  un bout libre, rien à corriger). Vérifié par tests seulement (pas à l'œil, ni `make drawio-check`).
