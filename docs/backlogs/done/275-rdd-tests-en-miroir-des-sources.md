# RDD : tests du mode en miroir des sources

> Refactor — mode RDD (tests) ; issu de l'analyse 273 (constat B9). Premier lot : les lots suivants (276 à 278)
> posent leurs tests dans les fichiers créés ici.

- `tests/engine/modes/rdd.test.ts` (1 501 lignes) couvre tout le mode ; seul `rdd/relations.test.ts` suit `src/`.
- Le découper en `tests/engine/modes/rdd/<fichier>.test.ts`, au chemin miroir de `src/engine/modes/rdd/` : `index`
  (page, palette, `check`), `tables`, `operations`, `fieldParts`, `fieldProperties`, `fieldHandles`, `regions`,
  `shapes/common/table` (rendu d'une table), `shapes/region`.
- Les tests sont **déplacés tels quels** (seuls les imports et les `describe` changent) ; les aides communes
  (fabriques de page, de table) vont dans un `tests/engine/modes/rdd/helpers.ts`.
- **Fini quand :** `rdd.test.ts` n'existe plus ; même nombre de tests avant / après (`vitest --reporter=verbose`
  compté) ; `make check` vert.
- Fait : `rdd.test.ts` découpé en `tests/engine/modes/rdd/` : `index` (page, palette, Diagnostics, ouverture),
  `tables` (lecture des champs, largeur, grille), `operations` (champs posés, table secondaire, kind, entités),
  `fieldParts` (ligne sélectionnée, suppression, glisser, séparateurs, commentaire), `fieldProperties` (panneau d'un
  champ), `fieldHandles` (« + »), `regions` (contenu, extension, ordre, « f », couleurs, obstacles),
  `shapes/common/table` (styles de palette, rendu des tables), `shapes/region` (palette, onglet) ; aides communes
  (`setup`, largeurs attendues, `setFields`) dans `helpers.ts`. Tests déplacés tels quels : seuls les imports changent,
  et un `describe` partagé entre deux fichiers y est répété. Même nombre de tests (104 avec `relations`, mêmes noms,
  comparés en `--reporter=verbose`). Aucun changement de comportement.
