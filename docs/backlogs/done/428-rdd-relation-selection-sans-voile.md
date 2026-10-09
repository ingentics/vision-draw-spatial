# RDD : flèche de relation sélectionnée sans voile ni contour

> Itération — mode RDD (sélection), reprise de 427 pour le mode RDD

- Une flèche de relation sélectionnée seule est mise en valeur en `none` : ni voile ni contour, ses poignées restent.
  Sélectionnée avec d'autres éléments, ou flèche qui n'est pas une relation : le style de la page (paramètre
  `selection.style`). Seul le mode RDD change.
- **Fini quand :** en mode RDD, cliquer une flèche de relation la sélectionne sans voile ni contour, avec ses
  poignées ; `make check` vert.
- Fait : `engine/plugins/modes/rdd/index.ts` — `edges.selectionStyle` : `none` pour une flèche de relation
  (`isRelationEdge`) sélectionnée seule (point d'entrée du sujet 427). Test `rdd/relations/index.test.ts` (relation
  seule, avec d'autres, hors relation). Validé par l'utilisateur dans l'appli (fixture `rdd.drawio`).
