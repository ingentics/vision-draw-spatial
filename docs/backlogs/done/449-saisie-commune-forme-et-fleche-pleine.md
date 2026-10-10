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
- Fait : dans `DragGesture.beginMove` (`edit/drag/gesture.ts`), un seul `pickAt` par appui, fait seulement si aucune
  poignée ni partie n'est saisie. Il est remis à `elementDrag`, qui choisit la forme (`shapeDrag`) ou la flèche
  pleine (`blockArrowDrag`). Les deux passent par `grabbedSelection` : la sélection multiple de la page qui contient
  l'élément saisi. Écart de comportement : aucun.

  Tests : `tests/engine/core/domains/edit/drag/gesture.test.ts` (nouveau) couvre quatre cas :
  - flèche pleine seule, avec un seul pick ;
  - flèche pleine dans une sélection multiple ;
  - flèche verrouillée ou ordinaire, qui ne se glisse pas ;
  - forme saisie, qui emporte la flèche pleine sélectionnée.

  `make check` vert. Vérifié dans l'appli (`block-arrow.drawio`) : la flèche libre se glisse par son corps, la forme
  A se glisse, puis annulé.
