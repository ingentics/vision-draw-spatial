# Labels du fichier : aller-retour sans perte, coller, réécriture rangée dans `format/`

> Audit 500 — tronc (fichier, hôte des modes) et mode Event storming (reprise de 478)

- Constats :
  - `importedLabel` (`plugins/modes/eventstorming/export/fileLabel.ts:21-29`) retire l'en-tête même quand le post-it
    masque les labels, alors qu'`exportedLabel` n'en met pas. Labels masqués, un post-it Command au texte
    `<b>Command</b><br>x` est enregistré tel quel puis rouvert en `x`.
  - `rewriteLabels` (`core/modes/fileLabels.ts:23`) écrit par `setCellRichLabel` (`format/cellEdits.ts:85-92`), qui met
    `html=1` sans échapper le texte. Un label brut (`html=0`, venu de draw.io) : `<` et `&` sont lus comme du HTML et
    `\n` n'est pas changé en `<br>` à l'export ; à l'import, la forme passe en `html=1`. Le fichier change à
    l'aller-retour.
  - Coller du XML de draw.io (`core/domains/edit/commands/clipboard.ts:39`) ne passe pas par `importedLabel` : l'en-tête
    reste dans le texte et sort en double à l'enregistrement suivant.
  - L'hôte des modes relit et réécrit tout le fichier (`core/domains/modes/pageModes.ts:130-138`, `readDrawio` puis
    `writeDrawio`) ; `rewriteLabels`, qui écrit l'arbre XML, est dans `core/modes/` au lieu de `core/format/` ;
    signatures asymétriques `importLabels(document, tree)` et `exportLabels(xml, document)`.
- Ce qu'on veut :
  - Import : rien n'est retiré d'un post-it dont les labels sont masqués.
  - La réécriture garde le format du label : un label brut reste brut (le mode reçoit et rend du texte brut, ou le
    tronc convertit et échappe dans les deux sens ; choix à faire au début du ticket, noté dans « Fait »).
  - Coller du XML étranger applique `importedLabel` aux formes collées, comme l'ouverture.
  - `rewriteLabels` va dans `core/format/` ; `PageModes` ne fournit que le rappel du mode (`labelOf`) ; la copie relue
    et la réécriture du fichier sont faites par `DocumentFile`. Signatures symétriques.
- Écart de comportement : seulement les trois corrections ci-dessus.
- Tests : `fileLabel.test.ts` (labels masqués, `html=0`) ; tronc, `rewriteLabels` seul (dans `format/`), aller-retour
  `serialize` puis `load` dans `file.test.ts`, exception levée par `exportedLabel` (fichier enregistré sans en-tête),
  coller d'un post-it avec en-tête.
- Docs : `AJOUTER_UN_MODE.md` (labels exportés : format reçu, coller), SPEC §14.5, SUMMARY (carte `core/format/`).
- **Fini quand :** sur `eventstorming-commande.drawio`, Labels décoché, un texte qui commence par le nom du type
  survit à l'enregistrement et la réouverture ; un post-it collé depuis un fichier exporté n'a pas l'en-tête dans son
  texte ; `make check` vert.
- Fait : réécriture déplacée dans `core/format/fileLabels.ts` (`rewriteLabels`, `rewritePageLabels` avec `only`, type
  `LabelRewrite`). Choix du format : le mode reçoit et rend toujours du HTML ; un label en texte brut (`html=0`) lui
  arrive converti (`textToHtml` : `<` en `&lt;`, retours à la ligne en `<br>`), et le label réécrit reste brut s'il n'a
  pas de mise en forme, sinon il passe en `html=1` (même texte affiché). `PageModes.fileLabels(pages, 'export' |
  'import')` ne fournit que le rappel protégé du mode (undefined si aucun mode n'en a) ; `DocumentFile` fait la copie
  relue à l'enregistrement (`withExportedLabels`) et la réécriture à l'ouverture ; `importLabels` / `exportLabels`
  retirés. Coller (`Clipboard.pasteXml`) applique `importedLabel` aux formes collées, avant `gestures.placed`, sur la
  page relue (`pageFromTree`, ajouté à `format/parse.ts`). Mode : `importedLabel` ne retire rien quand le post-it
  masque les labels. Écarts : un texte qui commence par le nom du type survit à l'aller-retour quand « Labels » est
  décoché ; un label brut venu de draw.io garde son texte (il passe en `html=1` avec l'en-tête) ; un post-it collé
  depuis un fichier exporté n'a pas l'en-tête dans son texte. Tests `tests/engine/core/format/fileLabels.test.ts`,
  `tests/engine/core/domains/edit/commands/clipboard.test.ts` (nouveau), aller-retour `serialize` puis `load` dans
  `file.test.ts`, mode en panne dans `pageModes.test.ts`, labels masqués et `html=0` dans `fileLabel.test.ts` (aides
  du test adaptées à la nouvelle API) ; doc `AJOUTER_UN_MODE.md`, SPEC §14.5, SUMMARY (`core/format/`). Vérifié dans
  l'appli sur `eventstorming-commande.drawio` (par l'API du moteur) : « Labels » décoché, « Payer » remplacé par
  « **Command** / x », enregistré puis rouvert : le texte reste « Command / x » ; « Labels » recoché, post-it collé avec
  l'en-tête : texte « Relancer », un seul en-tête à l'enregistrement. Fixture rechargée ensuite.
