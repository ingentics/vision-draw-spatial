# Ordre de dessin de la sélection (premier plan, arrière-plan)

> Itération — édition (sélection) ; panneau de droite

- Section « Disposition » dans le panneau d'une forme, d'une flèche et d'une sélection multiple, comme
  « Arrange » de draw.io : Premier plan, Avancer, Reculer, Arrière-plan.
- L'ordre est celui du fichier : la cellule (avec ses enfants, labels de flèche compris) est déplacée parmi les
  cellules de même parent ; premier plan = dernière, arrière-plan = première, avancer / reculer = échange avec
  la voisine. Une étape d'annulation par action.
- Raccourcis de draw.io, le focus sur la zone de dessin : ⌘ / Ctrl + Maj + F (premier plan), ⌘ / Ctrl + Maj + B
  (arrière-plan), Alt + Maj + F (avancer), Alt + Maj + B (reculer).
- **Fini quand :** deux formes qui se chevauchent échangent leur ordre via les boutons, une flèche passe sous une
  forme et revient ; l'ordre est le même une fois le fichier ouvert dans draw.io ; `make check` vert.
- Fait : `src/engine/format/order.ts` (`reorderCells`) : nouvel ordre des cellules sœurs, puis nœuds réécrits avec
  leurs descendants et leur indentation, à la place du premier ; `Engine.orderSelection` (une étape d'annulation,
  rien si l'ordre ne change pas). Section « Disposition » (`OrderSection`) dans les panneaux forme, flèche et
  sélection multiple ; raccourcis dans `CameraController` (`orderShortcut`, touches physiques). Tests
  `tests/engine/format/order.test.ts` (ordre, conteneur, labels de flèche, fichier intact). Vérifié dans l'appli : une
  flèche passée à l'arrière-plan perd ses sauts et passe sous les autres, ⌘ ⇧ F la remet au premier plan.
