# Jumelles dans l'entête de la vue

> Itération — mode RDD (tables) ; reprise de 181

- La vue (`rdd-view`) porte un **petit dessin de jumelles** en haut à droite de son entête : deux oculaires ronds,
  leurs corps et le pont entre eux, au trait fin (1 px), de la couleur du texte de l'entête à 50 % d'opacité
  (discret). Environ 14 × 9 px, à 7 px du bord droit, centré dans la hauteur de l'entête ; × 0,8 pour une table
  secondaire. Rendu de l'appli seulement (draw.io ne le montre pas).
- **Fini quand :** une vue montre ses jumelles discrètes en haut à droite, les autres tables non ; en table
  secondaire elles suivent l'échelle ; `make check` vert.
- Fait : `TableKind.binoculars` (posé sur `rdd-view`) ; `binoculars()` dans `rdd/shapes/common/table.ts` : deux
  oculaires (cercles de 16 segments), deux corps et le pont, dans un cadre `TABLE.binoculars` (14 × 9, à 7 px du bord
  droit, centré dans l'entête, × l'échelle), trait de 1 px × l'échelle, couleur du texte de l'entête à 50 %. Test
  `rdd.test.ts` (position, opacité, absentes des autres tables) ; SPEC §14.5. Vérifié dans l'appli sur ActiveUsers.
