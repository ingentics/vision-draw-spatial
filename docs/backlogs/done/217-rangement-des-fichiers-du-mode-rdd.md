# Rangement des fichiers du mode RDD

> Itération — mode RDD (code) ; reprise de 179

- `rdd/table.ts` mêle les données des tables et leur rendu ; on les sépare, sur le modèle des familles de formes
  (code commun dans `common/`) et du mode Séquences (`flows.ts` données, `steps.ts` opérations) :
  - `rdd/tables.ts` : données (clés `spatial.*`, `TABLE_KINDS`, tailles, champs, hauteurs) ;
  - `rdd/operations.ts` : opérations du mode (`setFields`, `setHeaderColor`, `setSecondary`), l'actuel `tables.ts` ;
  - `rdd/shapes/common/table.ts` : rendu et fabrique `table()`, communs aux formes (sans `index.ts` : pas une forme).
- Aucun changement de comportement. `AJOUTER_UN_MODE.md` mentionne `shapes/common/`.
- **Fini quand :** fichiers rangés ainsi, imports à jour, rendu inchangé dans l'appli ; `make check` vert.
- Fait : `rdd/table.ts` scindé en `rdd/tables.ts` (données) et `rdd/shapes/common/table.ts` (rendu, `table()`,
  constantes de dessin) ; l'ancien `rdd/tables.ts` devient `rdd/operations.ts`. Imports des formes, du mode et des
  tests à jour ; `AJOUTER_UN_MODE.md` (arborescence : `shapes/common/`, exemple RDD). Vérifié dans l'appli : rendu de
  `rdd.drawio` inchangé.
