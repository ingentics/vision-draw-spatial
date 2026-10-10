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
- Fait :
  - **Appli :**
    - `ExportPanel.tsx` est déplacé dans `src/app/export/`.
    - La classe CSS `flow-exports` devient `mode-exports`.
    - `baseName` (`download.ts`, testé dans `tests/app/download.test.ts`) donne le nom de base au `Viewer` (image)
      et aux Diagnostics.
    - Le format PlantUML est une constante du tronc, `PLANTUML_FORMAT` (`core/export/plantumlText.ts`). L'API des
      plugins et le point d'entrée du moteur l'exportent. Séquences s'en sert (`plantUml`), États aussi (nouveau
      `statesExporter`, que l'appli prend pour format et texte), et `ExportDialog` y indexe son rendu.
  - **Moteur :** `pageRectOfBox` (`render/space.ts`) fait le passage boîte du monde → rectangle de page pour
    `imageExport.ts` et `scene.ts`.
  - **Séquences :** nouveau `sequences/direction.ts`, qui réunit :
    - les icônes du sens ;
    - la propriété « Sens » (`DIRECTION_PROPERTY`) et la touche « x » (`DIRECTION_KEY`) ;
    - `isReturnEdge`, seule lecture de la règle « retour = pointillés », que l'export reprend aussi.
  - **États :**
    - la propriété « Contenu » (`BODY_PROPERTY`) passe dans `state/stateBody.ts` ;
    - `EXIT_COLOR` devient `POINT_COLOR` ;
    - le commentaire de `TITLE_FONT` est corrigé ;
    - le `swatch` des points d'entrée et de sortie (qui ne sont pas stylables) est retiré ;
    - `setCompositeStyle`, `compositeOutline`, `tabRect` et `tabPath` ne sont plus exportés.
  - **RDD :** la constante `TABLE_LEVELS` sert aux boutons, à `steppedLevel` et à `isTableLevel`. `tableLevelKey`
    reste dans `editing/tableProperties.ts`, à l'image de `FIT_REGION_KEY` dans `regionProperties.ts` (patron du
    dossier) : écart avec le ticket.
  - **Code mort :** `pngDensity()` sort de `render/png/pngDensity.ts`. Le test lit le bloc `pHYs` lui-même.
  - Commentaire de `sequences/export/plantuml.ts` remis en forme.
  - Écart de comportement : aucun. Les tests ne changent que par `final.test.ts` (nom de la couleur) et
    `pngDensity.test.ts` (lecture du bloc dans le test).
  - `make check` vert. Vérifié dans l'appli :
    - le panneau d'export PNG s'ouvre ;
    - l'export PlantUML de `states.drawio` affiche son texte et le lien de rendu ;
    - après un rechargement complet, l'appli tourne sans erreur (les erreurs de rechargement à chaud venaient des
      états intermédiaires).
