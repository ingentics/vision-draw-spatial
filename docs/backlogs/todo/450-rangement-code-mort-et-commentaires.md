# Rangement, code mort et commentaires des ajouts récents

> Audit 444 — appli, Séquences, RDD, Machine à états, export

- Rangement :
  - `src/app/ExportPanel.tsx` va dans `src/app/export/`.
  - La classe `flow-exports` (`main.css`, Séquences et États) est renommée `mode-exports`.
  - Le nom de base d'un fichier est calculé dans une seule fonction, dans `download.ts`, au lieu de deux copies
    (`Viewer.tsx:204-207`, `diagnosticsExport.ts:16-19`).
  - Le passage d'une boîte 3D à un rectangle de page n'est écrit qu'une fois (`imageExport.ts:125-126`,
    `scene.ts:65-66`).
- Séquences : la règle « retour = pointillés » vient d'un seul prédicat. Il est regroupé avec `setReturn`, la
  propriété « Sens » et ses icônes dans un module `direction`, et lu par l'export
  (`sequences/export/plantuml.ts:107,119`).
- États : la propriété « Contenu » passe de `states/index.ts:67-87` à `state/`. Le format PlantUML de l'appli
  (`app/plugins/modes/states/index.tsx:8`) devient une constante unique, partagée avec Séquences.
- RDD :
  - `tableLevelKey` passe de `editing/tableProperties.ts:156` à `tables/`.
  - Une constante `TABLE_LEVELS` remplace `Object.keys(LEVEL_SCALES) as TableLevel[]` (`tableLayout.ts:63`,
    `tableProperties.ts:135`).
- Code mort :
  - `pngDensity()`, qui n'a d'appelant que dans son test, sort de l'export (ou le test passe par `withPngDensity`).
  - On retire les `swatch` des points d'entrée et de sortie, qui sont `styleable: false`.
  - `setCompositeStyle`, `compositeOutline`, `tabRect` et `tabPath` ne sont plus exportés.
- Commentaires :
  - `TITLE_FONT` (`stateLayout.ts:24`) ne vaut que pour le titre.
  - `EXIT_COLOR` (`exitKind.ts:17`) est renommé, car il sert aussi au point d'entrée.
  - Remettre en forme le commentaire de `sequences/export/plantuml.ts:117`.
- Écart de comportement : aucun ; les tests ne changent que par leurs imports.
- **Fini quand :** `make check` vert, et l'export PNG, l'export PlantUML (Séquences, États) et les tailles de table
  RDD fonctionnent comme avant dans l'appli.
