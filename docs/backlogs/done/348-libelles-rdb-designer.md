# Libellés « RDD » renommés « RDB Designer »

> Itération — mode RDD (nom, catégorie de palette, encart des réglages de page)

- Les libellés visibles « RDD » deviennent « RDB Designer » : nom et nom court du mode, catégorie de palette, encart
  des réglages de page. L'identifiant du mode (`rdd`) et les attributs du fichier (`spatial.rdd.*`) ne changent pas.
- **Fini quand :** le sélecteur de mode, la palette et le panneau de page affichent « RDB Designer » dans l'appli.
- Fait : nom du mode, nom court, catégorie de palette et encart des réglages de page passent à « RDB Designer » (`src/engine/plugins/modes/rdd/index.ts`, test `relations/index.test.ts`). Identifiant `rdd` et attributs `spatial.rdd.*` inchangés. Validé à l'œil dans l'appli.
