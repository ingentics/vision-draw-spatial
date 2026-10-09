# Glisser la flèche pleine par son corps

> Itération — édition (déplacement) ; reprise de 410

- Aujourd'hui, une flèche ne se déplace pas en la saisissant (seuls ses bouts se glissent) ; la flèche pleine, qui
  ressemble à une forme, ne peut donc pas être déplacée à la souris.
- Un appui sur le corps d'une flèche pleine, sur une page modifiable, puis un glisser la déplace en entier, comme une
  forme : même déplacement que celui des flèches sélectionnées au clavier (123), donc aimanté à la grille par sa
  queue, un bout rattaché à une forme qui ne bouge pas en est détaché (il devient libre là où il est posé), une flèche
  verrouillée ne bouge pas. Saisie dans une sélection multiple, toute la sélection bouge avec elle. Une étape
  d'annulation.
- Les autres flèches (traits) ne changent pas : leur corps ne se glisse toujours pas.
- **Fini quand :** dans l'appli, sur `fixtures/block-arrow.drawio`, la flèche pleine libre se glisse à la souris et
  reste droite, la rattachée se détache de A et B en se déplaçant, ⌘ Z annule ; `make check` vert.
- Fait : `domains/edit/drag/gesture.ts` : `blockArrowDrag`, essayé après `shapeDrag` à l'appui, prépare un `moveDrag`
  de la flèche pleine saisie (`pickAt` sur une arête `isBlockArrow`), ou de toute la sélection multiple si elle en
  fait partie ; origine d'aimantation : sa queue (`edgeEndPoints`) ; flèche verrouillée écartée par `movePlan`, donc
  pas de glisser. Vérifié à l'œil sur `fixtures/block-arrow.drawio` : la flèche libre en biais se glisse et reste
  droite, la rattachée se détache de A et B, deux ⌘ Z remettent tout en place. Non vérifié : sélection multiple,
  flèche verrouillée. Pas de test automatique (aucun banc pour les gestes de glisser, qui demandent rendu et pick) ;
  `make check` vert.
