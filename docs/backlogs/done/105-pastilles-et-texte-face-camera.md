# Pastille et texte des flèches de séquence face à la caméra (au choix)

> Itération — mode séquences (pastilles des flèches)

- Paramètre « Pastille face à la caméra » (groupe Pastilles, coché par défaut) : décoché, la pastille reste couchée
  à plat dans le plan de la page, comme le texte.
- Paramètre « Texte des flèches en séquence face à la caméra » (coché par défaut) : le texte d'une flèche qui porte
  une pastille se redresse face à l'écran, comme la pastille. Les flèches sans pastille ne changent pas.
- **Fini quand :** en vue 3D sur une page en mode séquences, chaque case bascule la pastille / le texte entre « à
  plat » et « face à la caméra » ; `make check` vert.
- Fait : paramètres `shapes.edgeBadgeFaceCamera` et `shapes.edgeBadgeLabelFaceCamera` (`settings.ts`, vrais par
  défaut), passés au rendu par `EdgeBadgeStyle` (`faceCamera`, `labelFaceCamera`). La pastille ne prend
  `billboard = 'screen'` que si demandé (`decorations.ts`) ; le texte d'une flèche à pastille passe dans un groupe
  `label-pivot` face à l'écran, posé sur son point d'ancrage (`labelAnchor`, `edge.ts` / `pageScene.ts`). Cases
  dans Paramètres › Modes › Séquences › Pastilles. Tests dans `sequences.test.ts` ; vérifié à l'œil en 3D sur
  `fixtures/sequences.drawio` (cases cochées : redressés ; décochées : à plat).
