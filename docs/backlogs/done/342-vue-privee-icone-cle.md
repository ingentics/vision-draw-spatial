# Vue privée ou publique, icône de clé

> Itération — mode RDD, table « Vue » (272, vue matérialisée)

- Une vue est **publique** (par défaut) ou **privée**. Nouvelle option de table booléenne `private`
  (`spatial.rdd.private`), comme `materialized` : case « Privée » au panneau de la vue, dans `TABLE_OPTIONS`
  (`editing/tableProperties.ts`), permise seulement aux vues (`options` de `rdd-view`).
- Une vue privée affiche une **icône de clé** en haut de l'entête, **à gauche du titre** ; les jumelles restent à
  droite : la vue privée a donc deux icônes. Une vue publique n'en a qu'une (les jumelles).
- La largeur de la table réserve la place de l'icône de gauche (comme celle de droite, `tableWidth`).
- Le tracé de la clé s'ajoute aux icônes d'entête (`shapes/common/headerMarks.ts`), même cadre de 14 × 9, même trait.
- **Fini quand :** dans l'appli, cocher « Privée » sur une vue fait apparaître une clé à gauche du nom, les jumelles
  restant à droite ; décocher l'enlève ; le nom long n'empiète sur aucune icône ; le fichier rouvert garde l'option ;
  draw.io rouvre le fichier identique (attribut inconnu préservé) ; `make check` vert.
- Fait : option de table `private` (`spatial.rdd.private`) dans `TABLE_OPTIONS` (`editing/tableProperties.ts`), permise
  aux vues (`tableKinds.ts`) ; `leftMark` et `PRIVATE` dans `tables/tableLayout.ts` ; tracé de la clé dans
  `shapes/common/headerMarks.ts` (paramètre `side`, cadre 14 × 9) ; rendu dans `shapes/common/table.ts`. Tests
  ajoutés (`table.test.ts`, `tableProperties.test.ts`). `make check` vert.
