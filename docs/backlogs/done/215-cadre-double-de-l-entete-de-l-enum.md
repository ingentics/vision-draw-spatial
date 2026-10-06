# Cadre double autour de l'entête de l'entité énumérative

> Itération — mode RDD (tables) ; reprise de 180

- L'entête de l'entité énumérative (`rdd-enum`, zone de la mention `«enum»` et du nom) a un **cadre double** : un
  second trait, de la couleur et de l'épaisseur de la bordure, à 3 px à l'intérieur de l'entête (× 0,8 pour une
  table secondaire). Les autres tables gardent un cadre simple. Rendu de l'appli seulement (draw.io ne le montre pas).
- **Fini quand :** sur une page RDD, une entité énumérative montre son entête cerclé d'un double trait, une entité un
  trait simple ; en table secondaire, l'écart suit l'échelle ; `make check` vert.
- Fait : `TableKind.doubleHeader` (posé sur `rdd-enum`) ; `rdd/table.ts` trace un second rectangle à
  `TABLE.doubleGap` (3 px × l'échelle) dans l'entête, du trait de la bordure. Test dans
  `tests/engine/modes/rdd.test.ts` (entité : cadre simple ; énumération : rectangle intérieur, écart à l'échelle en
  table secondaire). SPEC §14.5. Vérifié dans l'appli sur `rdd.drawio` (Role cerclé d'un double trait, User simple).
