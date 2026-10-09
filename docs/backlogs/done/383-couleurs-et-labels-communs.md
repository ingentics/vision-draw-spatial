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
- Fait :
  - Couleur regroupée dans `render/styleColors.ts` : `darken`, `lighten`, `shade` (sortis de `render/decorations.ts`),
    `hexToHsl` / `hslToHex` (sortis de `edit/stylePresets.ts`, exportés, purs), `styleColorValue(style, clé, repli)`
    (règle `none` / `default` / repli, en chaîne ; `styleColor` la réutilise), `DEFAULT_ACCENT` (déplacé de
    `decorations.ts`), `labelBackdropOf(style, onEdge, réglages, page)` et `labelBackdropSettings(shapes)` (réglages
    `shapes.edgeLabel…` lus une fois, pour la scène et l'éditeur en place) ; `readableOn` lit les composantes par
    `Color.getRGB` (arrondies à l'octet) au lieu de découper la chaîne. Plugin API : `DEFAULT_ACCENT`,
    `styleColorValue` en plus.
  - `isHexColor(value, short = false)` (`model/styleValues.ts`) : seule regex hexadécimale de couleur du moteur
    (`HEX_COLOR`), utilisée par `labelBackdropOf` et `parseColor` (`format/richText.ts`, forme courte dépliée) ; la
    regex d'entités de `format/labelText.ts` n'est pas une couleur.
  - Texte d'une flèche (`render/edges/edge.ts`) : `labelObject` et `textAnchors(style)` (nouveau, `render/flat/box.ts`,
    partagé avec `createLabel`) ; fond par `labelBackdropOf` (ancien `edgeLabelBackdrop` supprimé) ; l'éditeur
    (`labelEditor.labelEditBackdrop`) ne fait plus qu'adapter le résultat à `LabelEditRequest`.
    `RenderContext.edgeLabelBackdrop` typé `LabelBackdropSettings`.
  - `'#1a73e8'` remplacé par `DEFAULT_ACCENT` dans `distributed-cache/facade.ts`, `graph/graphPage.ts`,
    `interaction/minimapLayout.ts` et aussi `settings/schema/view.ts` (défaut de `selection.accentColor`, non cité
    au constat) ; `settings/`, `graph/` et `interaction/minimapLayout.ts` importent donc `render/styleColors.ts`.
  - `setStyleKey(style, clé, valeur)` et `withStyleDefault(style, clé, valeur)` dans `format/style.ts` :
    `setCellStyleValue` (`format/cellEdits.ts`) et `stripCellKeys` (`format/clipboardCells.ts`) passent par
    `setStyleKey` ; `domains/edit/helpers.ts` (`withStyleValue`) supprimé, remplacé par `withStyleDefault` dans
    `drag/connect.ts` et `commands/elements.ts`.
  - `minimapOutline.ts` et `rdd/shapes/common/table.ts` lisent leur couleur par `styleColorValue`.
  - Comparaisons avant / après (test jetable, supprimé) : `deriveStroke` sur 24 096 couleurs (les 4 096 `#rgb` + 20 000
    au hasard) : 0 écart avec les conversions pures déplacées. Le HSL de Three.js (celui de `darken`) aurait donné 45
    écarts d'une unité, dont le contour du pastel `#dcefea` (`#62b7a0` → `#62b7a1`, qui aurait cassé
    `matchesPreset` sur les formes existantes) : les deux calculs HSL restent donc distincts, commentés. `readableOn`
    sur 433 728 cas (couleurs × 9 opacités, chaîne et `Color`) : 0 écart. `labelBackdropOf` contre les deux anciennes
    règles (13 valeurs × 3 réglages × forme / flèche, rendu et éditeur) : identique. `isHexColor` / `parseColor` :
    identiques sur 16 valeurs. `setStyleKey` / `withStyleDefault` / `stripCellKeys` sur 18 styles × 6 clés × 5
    valeurs, et `withStyleDefault` sur les 36 modèles de la palette + styles de connecteur (264 cas) : identiques
    hors les écarts ci-dessous.
  - Écarts (cas limites) : `setCellStyleValue(…, undefined)` retire toutes les occurrences d'une clé en double
    (avant : la première seulement, la suivante restait effective) ; `stripCellKeys` ôte les tokens vides (`a=1;;b=2;`
    → `a=1;` au lieu de `a=1;;`) quand il retire une clé ; `withStyleDefault` ôte les tokens vides ou blancs d'un
    modèle mal formé (aucun dans la palette) ; table RDD avec `fontColor=none` : texte lisible sur l'entête (avant :
    `none` transmis, couleur nulle) ; mini-carte : `fillColor` lu sans espaces autour.
  - Tests : `styleColors.test.ts` (`styleColorValue`, `labelBackdropOf`, `labelBackdropSettings`, HSL ; bloc
    `darken` / `lighten` / `shade` déplacé tel quel depuis `decorations.test.ts`), `styleValues.test.ts` (forme
    courte), `format/style.test.ts` (`setStyleKey`, `withStyleDefault`), `render/flat/box.test.ts` (`textAnchors`,
    nouveau) ; `sequences.test.ts` : import seul. Fixtures en pixels (`shapesFixture`, `labelsFixture`, flèches)
    inchangées et vertes. Docs : `coding.md` §4, `AJOUTER_UNE_FORME.md`.
  - Validation : tests seulement (`make check` vert) ; textes des flèches (halo, fond) pendant et hors édition non
    vérifiés à l'œil dans l'appli. Dette notée : 398, 399.
