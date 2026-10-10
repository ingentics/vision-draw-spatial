# Saisie commune au glisser d'une forme et d'une flèche pleine

> Audit 444 — moteur, glisser (reprise de 424)

- Constat : `DragGesture.blockArrowDrag` (`edit/drag/gesture.ts:188-210`) recopie la saisie de `shapeDrag` (`:165-181`) :
  `pickAt`, sélection de la page, `grabbedSelected`, `movableShapes`, `selectedEdgeIds`. Un même appui fait aussi
  `pickAt` deux fois quand la forme n'est pas saisie. Aucun test ne couvre ce glisser.
- Ce qu'on veut : un seul `pickAt` par appui, et une fonction commune « élément saisi, et le reste de la sélection
  multiple s'il en fait partie » pour la forme comme pour la flèche pleine.
- Écart de comportement : aucun.
- Tests : glisser une flèche pleine seule, dans une sélection multiple, et verrouillée (rien ne bouge).
- **Fini quand :** sur `block-arrow.drawio`, une flèche pleine se glisse par son corps, seule ou avec la sélection,
  comme avant ; les formes aussi.
