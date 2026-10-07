# RDD : l'onglet d'une région enfant compte dans l'ajustement de sa parente

> Itération — mode RDD (région) ; reprise de 184 et 234

- Pour ajuster une région à son contenu (`f`) ou l'agrandir autour d'une forme posée, une région contenue compte avec
  son onglet : son emprise commence en haut de l'onglet (16 px au-dessus d'elle, s'il y a un nom). La marge de 20 px se
  prend au-dessus de l'onglet.
- **Fini quand :** `f` sur une région qui ne contient qu'une région laisse 20 px entre son bord haut et le haut de
  l'onglet de l'enfant ; `make check` vert.
- Fait : `extentOf` (`rdd/regions.ts`) : bornes d'une forme, onglet compris (16 px au-dessus) pour une région nommée ;
  utilisée par `fitRegion` (touche `f`) et `growRegions` (agrandissement à la pose). Tests `rdd.test.ts` (`f` sur une
  région qui ne contient qu'une région ; région sortie par le haut ; attente du sujet 234 mise à jour). SPEC §14.5.
  Vérifié dans l'appli : `f` sur une région contenant une région laisse 20 px au-dessus de l'onglet de l'enfant, comme
  sur les autres côtés.
