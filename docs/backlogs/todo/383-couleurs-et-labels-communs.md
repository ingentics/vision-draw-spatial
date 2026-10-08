# Couleurs et labels : une règle, un endroit

> Architecture du moteur — mutualisation. Audit du 2026-10-08 (`AUDIT.md`).

- Constat :
  - fond d'un label décidé deux fois, avec deux regex hexa : `render/edges/edge.ts:323-330` (`edgeLabelBackdrop`) et
    `domains/edit/text/labelEditor.ts:197-215` (`labelEditBackdrop`) ; `isHexColor` (`model/styleValues.ts:61`)
    n'accepte que `#rrggbb` ;
  - `darken`, `lighten`, `shade` dans `render/decorations.ts:186-215` (fichier des décorations de sélection) ;
    `hexToHsl` / `hslToHex` à la main dans `edit/stylePresets.ts:119-155` ; décodage hexa à la main dans `readableOn`
    (`render/styleColors.ts:64-71`) ; règle `none` / `default` / repli de `styleColor` refaite dans
    `shapes/minimapOutline.ts:21` et `rdd/shapes/common/table.ts:117` ;
  - `'#1a73e8'` en dur dans `architecture/distributed-cache/facade.ts:33`, `graph/graphPage.ts:50`,
    `interaction/minimapLayout.ts:87` au lieu de `DEFAULT_ACCENT` (`decorations.ts:13`) ;
  - label de flèche : `edge.ts:294-320` refait `labelObject` (`render/flat/box.ts:138-144`) ; traduction
    `align`/`verticalAlign` en ancrages dupliquée (`box.ts:83-84`, `edge.ts:293,299`) ;
  - écriture d'une clé dans une chaîne de style faite trois fois : `format/cellEdits.ts:102-103`,
    `domains/edit/helpers.ts:9-13` (`withStyleValue`, règle de format dans un domaine), `format/clipboardCells.ts:184-187`.
- Ce qu'on veut : la couleur regroupée dans `render/styleColors.ts` (`darken`, `lighten`, `shade`, conversions HSL
  pures, `styleColorValue(style, key, repli): string | null`) ; `isHexColor` accepte la forme courte (option) ;
  `labelBackdropOf(style, onEdge, réglages)` unique ; `labelObject` et `textAnchors(style)` pour les flèches ;
  `DEFAULT_ACCENT` exporté (API des plugins) ; `setStyleKey(style, key, value)` dans `format/style.ts`.
- Écart : aucun ; `deriveStroke` comparé avant / après sur une vingtaine de couleurs (test jetable, `coding.md` §7)
  si la conversion HSL change de source.
- **Fini quand :** une seule regex hexa dans `src/engine` ; `grep -rn "'#1a73e8'" src/engine` ne trouve que
  `DEFAULT_ACCENT` ; textes des flèches (halo, fond) identiques à l'œil, pendant et hors édition ; `shapesFixture`
  vert sans changement ; `make check` vert.
