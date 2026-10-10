# RDD : flèches de relation en contour en sélection multiple

> Itération — mode RDD (sélection), reprise de 428

- Une flèche de relation sélectionnée avec d'autres éléments est mise en valeur en `outline` (contour), quel que
  soit le style de la page. Seule, elle reste en `none` (sujet 428). Les tables et les flèches qui ne sont pas des
  relations gardent le style de la page.
- **Fini quand :** en mode RDD, une sélection multiple (tables et relations) montre les flèches de relation en
  contour ; `make check` vert.
- Fait : `engine/plugins/modes/rdd/index.ts` — `edges.selectionStyle` : `outline` pour une flèche de relation
  (`isRelationEdge`) sélectionnée avec d'autres éléments, `none` seule (inchangé). Test
  `rdd/relations/index.test.ts` (relation seule, avec d'autres, hors relation). Validé par l'utilisateur.
