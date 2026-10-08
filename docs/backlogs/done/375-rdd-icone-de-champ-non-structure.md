# Icône violette des champs non structurés

> Itération — mode RDD, ligne de champ (reprise de 248)

- Un champ de type « Non structuré » (`dynamic`) prend l'icône `docs/assets/embed.svg` : losange violet `#ae62e3`
  cerné de `#888888` (celui des champs d'embedded), au lieu de la couleur de son kind. Le petit losange blanc du
  nullable reste (`embed_opt.svg`).
- **Fini quand :** dans l'appli, un champ passé en « Non structuré » a le losange violet, et retrouve la couleur de son
  kind en changeant de type.
- Fait : `fieldIconColor` (`tables/tableColors.ts`) donne au losange d'un champ `dynamic` la couleur de l'embed
  (`#ae62e3`), utilisée par `shapes/common/fieldRow.ts` ; le trou du nullable reste. Test de rendu dans
  `tests/.../shapes/common/table.test.ts`. Fichier `.drawio` inchangé (rendu seul).
