# Amener à l'écran la forme dont on édite le texte

> Itération — édition du texte ; `src/engine/core/edit/text/labelEditor.ts`

- Bug : quand on passe en édition de texte sur une forme (ou un texte de lien) qui n'est pas entièrement affichée,
  la zone d'édition est décalée par rapport à la forme.
- À l'entrée en édition, si la boîte de la forme (ou du texte édité) est déjà entièrement visible dans le canvas, la
  caméra ne bouge pas. Sinon, elle se déplace juste ce qu'il faut pour que la boîte soit visible avec une marge de
  20 px écran au bord du canvas : pas de recentrage, translation seule, zoom et orientation inchangés (pour une
  boîte plus grande que le canvas, on aligne son coin haut-gauche avec la marge).
- La marge se mesure sur la forme entière (pas seulement sa zone de texte) ; pour un texte de flèche, sur une boîte
  de 120 × 32 px autour de son point.
- Le déplacement est animé (`animateCameraTo`, ~200 ms) ; l'édition ne s'ouvre qu'une fois la vue arrivée, calée sur
  la forme (une autre demande d'édition ou un autre mouvement de vue entre-temps l'annule).
- Vaut pour toutes les entrées en édition : double-clic, F2, « Modifier » du panneau contextuel, texte de lien
  (Entrée n'édite pas : elle sert à la vue globale, ticket 242).
- **Fini quand :** sur une forme coupée par le bord du canvas, le double-clic fait glisser la vue juste assez pour la
  montrer en entier avec 20 px de marge, et la zone d'édition est exactement sur la forme ; sur une forme déjà
  visible, la vue ne bouge pas ; `make check` vert.
- Fait : cause du décalage : l'éditeur de l'UI (`src/app/LabelEditor.tsx`) se recale dans le canvas quand la zone
  dépasse. `revealShift` (`interaction/camera.ts`) calcule le déplacement écran qui amène une boîte à 20 px des bords
  (coin haut-gauche sur la marge si elle est plus grande que le canvas) ; `LabelEditor.startLabelEdit`
  (`core/edit/text/labelEditor.ts`) l'applique à la forme entière (ou à 120 × 32 px autour du point d'un texte de
  flèche) par `dragGround`, anime la vue (200 ms) et n'ouvre l'éditeur qu'à l'arrivée (`animateCameraTo` prend un
  rappel `onDone`, jamais appelé si l'animation est interrompue ; un jeton écarte une demande dépassée). Tests :
  `tests/engine/interaction/camera.test.ts` (boîte visible, coupée sur chaque axe, plus grande que le canvas).
  Vérifié dans l'appli sur `docs/test.drawio` : forme coupée en bas, la vue glisse puis l'éditeur s'ouvre calé.
