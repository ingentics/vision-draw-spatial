# RDD : nom court du mode, « RDB Designer »

> Itération — mode RDD (nom du mode)

- Le mode s'affiche « RDB Designer » au lieu de « RDB Designer — Relational Database Designer ».
- **Fini quand :** le sélecteur de mode montre « RDB Designer » ; `make check` vert.
- Fait : `name: 'RDB Designer'` dans `rdd/index.ts` ; `shortName`, identique, retiré (il vaut `name` par défaut) ;
  commentaire du mode aligné. Validé par les tests seulement.
