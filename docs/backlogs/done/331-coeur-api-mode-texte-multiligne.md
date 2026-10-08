# Cœur : texte multiligne d'une partie de forme, en police à chasse fixe

> API des plugins de mode (`core/modes/types.ts`, `core/plugins/index.ts`) ; prérequis du sujet 269 (corps YAML d'un
> document RDD). Les flèches qui arrivent sur une partie sont le sujet 333.

Le cœur n'apprend rien du RDD : il offre aux modes un texte de partie sur plusieurs lignes, en police à chasse fixe,
dessiné tronqué et édité dans le canvas comme dans le panneau. Le mode décide de tout le reste (attribut où il range
le texte, tabulations, taille).

Ce qui existe déjà et sert tel quel : `ModePartText.fontSize` (taille du texte), l'éditeur de label multiligne
(`richEditor.ts` : Entrée passe à la ligne, ⌘ + Entrée ou clic dehors valide, Échap annule), la police de code du
rendu (`TextSpec.fontFamily`, `pickFontKey`), la mesure du texte (`measureText`, déjà dans l'API des plugins) et
`ModeProperty` `text` `multiline` (zone de texte du panneau).

- **Édition dans le canvas** : `ModePartText` gagne deux options.
  - `multiline` : `editPartLabel` (`domains/edit/text/labelEditor.ts`) ouvre l'éditeur sans `singleLine`, texte en
    haut à gauche du cadre (`verticalAlign: 'top'`), sans retour automatique (`whiteSpace: 'nowrap'`) ; le cadre
    reste `zone`, avec ascenseurs si le texte le dépasse. Mêmes touches que le label multiligne existant.
  - `monospace` : éditeur en police de code (`fontFamily: 'Courier New'`, valeur draw.io que reconnaît
    `isMonospace`).
  - Le mode reçoit le texte saisi tel quel dans `setText` (tabulations comprises).
- **Rendu** : `createLabel` (`render/flat/box.ts`) prend un 5ᵉ paramètre facultatif `options` :
  - `monospace` : police de code ;
  - `truncate` : pas de retour à la ligne ; une ligne trop large pour `zone` finit par « … » ; si les lignes
    dépassent la hauteur de `zone`, la dernière ligne visible finit par « … » et les suivantes ne sont pas dessinées.
  - La découpe est une fonction pure `truncateLines(text, width, height, font, measure)` dans
    `render/textTruncate.ts`, avec l'interligne du rendu existant, testée dans
    `tests/engine/core/render/textTruncate.test.ts` (ligne trop large, trop de lignes, les deux, texte vide).
- **Panneau** : `ModeProperty` `text` gagne `monospace` (zone de texte en police à chasse fixe, sans retour
  automatique : `wrap="off"`). Une zone `multiline` ne dépasse plus 16 lignes de haut ; au-delà, et en largeur, elle
  a des ascenseurs. Tout le texte reste lisible et modifiable. Touches inchangées (⌘ + Entrée ou sortie valide,
  Échap annule).
- Exports : rien de nouveau dans `core/plugins/index.ts` sauf le type des options de `createLabel` ; le moteur
  ne garde aucun état nouveau (pas de domaine touché hors `labelEditor`).
- Pas d'effet sur le fichier draw.io : aucune clé nouvelle n'est écrite par le cœur.
- **Fini quand :**
  - `truncateLines` est testée ; un test de `labelEditor` vérifie qu'une partie `multiline` / `monospace` ouvre un
    éditeur multiligne en police de code ;
  - à l'œil sur `rdd.drawio` : l'édition d'un nom de champ et les champs texte du panneau se comportent comme
    avant (une ligne, Entrée valide) ;
  - aucun mode ne s'en sert encore : le comportement multiligne et monospace se vérifie à l'œil avec le sujet 269,
    son premier usage (dit dans le « Fait : ») ;
  - `make check` vert.
- Fait : `ModePartText` gagne `multiline` et `monospace` (`core/modes/types.ts`) ; `editPartLabel`
  (`domains/edit/text/labelEditor.ts`) ouvre alors un éditeur multiligne en haut à gauche, sans retour automatique,
  en `Courier New`, avec ascenseurs dans le cadre (`app/LabelEditor.tsx`). `createLabel` (`render/flat/box.ts`)
  prend `options` (`LabelOptions`, exporté dans l'API des plugins : `monospace`, `truncate`) ; la découpe est
  `truncateLines` (`render/textTruncate.ts`). `ModeProperty` `text` gagne `monospace` (`app/Fields.tsx`,
  `app/plugins/modes/ModeFields.tsx`, `main.css`) : zone `wrap="off"`, 16 lignes de haut au plus.
  Tests : `textTruncate.test.ts`, `labelEditorPart.test.ts`. À l'œil : l'appli se charge sans erreur et les champs
  existants (une ligne) sont inchangés (aucun mode n'utilise encore les options) ; le comportement multiligne et
  monospace se vérifiera avec le sujet 269, son premier usage. `make check` vert.
