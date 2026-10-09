# Lignes vides d'un texte gardées et affichées

> Itération — texte des formes et des flèches (lecture du label, édition en place, rendu).

- Constat : après l'édition du texte d'une forme ou d'une flèche, les lignes vides saisies par l'utilisateur
  disparaissent. Pistes relevées :
  - `htmlToText` (`src/engine/core/format/labelText.ts`) finit par `.trim()` et retire les frontières de blocs en
    tête et en fin : les lignes vides du début et de la fin d'un label `html=1` sont perdues à la lecture ; le
    regroupement des frontières de blocs consécutives est aussi à vérifier sur `<div><br></div>` (ligne vide en
    milieu de texte) ;
  - à vérifier : l'éditeur (`src/app/richEditor.ts`, texte et HTML produits), l'écriture
    (`setCellLabel` / `setCellRichLabel`), la lecture du texte riche (`format/richText.ts`) et la mise en page du
    rendu (`render/richLayout.ts`, `render/troikaText.ts`), pour les labels `html=1` et texte brut.
- Ce qu'on veut : une ligne vide saisie (en tête, au milieu, en fin) est écrite dans le fichier comme draw.io
  l'écrit, relue telle quelle et affichée (hauteur d'une ligne vide, centrage vertical compris), pour le texte d'une
  forme, le texte principal d'une flèche et ses textes de début / fin. Un texte qui ne contient **que** des blancs
  reste vide (le texte d'une flèche est alors supprimé, comme aujourd'hui).
- Référence : draw.io (même label ouvert dans draw.io : même nombre de lignes, même position). Fixture avec des
  lignes vides en tête, au milieu et en fin, en `html=1` et en texte brut, validée par `make drawio-check`.
- **Fini quand :** dans l'appli, saisir « a », ligne vide, « b », ainsi qu'une ligne vide en tête et en fin, sur une
  forme et sur une flèche : les lignes vides restent à l'écran après validation et après rechargement ; la fixture
  s'affiche dans draw.io comme dans l'appli ; tests (lecture, écriture, mise en page) ; `make check` vert.
- Fait : causes trouvées — (1) lecture `html=1` : `htmlToText` coupait les lignes vides de tête et de fin (`.trim()`,
  frontières de blocs retirées) et comptait deux lignes vides pour un `<div><br></div>` au milieu ; (2) écriture
  `html=1` (`textToHtml`, `richToHtml`) et contenu de l'éditeur : une ligne vide finale s'écrivait `<br>` final, que
  le HTML (draw.io, l'éditeur) n'affiche pas : perdue à la validation suivante ; (3) rendu : troika ne donne aucune
  hauteur à une ligne vide finale (ligne sans glyphe), qui ne comptait ni en hauteur ni dans le centrage ; (4) un
  texte de forme fait seulement de lignes vides s'écrivait `<br>`. Référence draw.io (export PNG / SVG de draw.io) :
  `a<br>` = 1 ligne, `a<br><br>` et `a<div><br></div>` = 2 ; les retours à la ligne littéraux d'un label HTML valent
  des `<br>` et ceux de la fin des lignes vides (`mxUtils.replaceTrailingNewlines` : `<div><br></div>`) ; en texte
  brut chaque `\n` fait une ligne, finales comprises. Corrections : `htmlToText` = `richToText(parseRichHtml())`
  (déplacée dans `format/richText.ts`, une seule règle des lignes) ; `parseRichHtml` convertit les retours littéraux
  comme draw.io et ignore les blancs entre deux blocs ; nouvelle `joinHtmlLines` (`<br>` entre lignes, lignes vides
  finales en `<div><br></div>`) utilisée par `richToHtml`, `textToHtml` et le contenu initial de l'éditeur
  (`textToEditorHtml` passe par `richToHtml`) ; `emptyIfBlank` (`format/labelText.ts`) partagée par le texte des
  formes (`TextEdits.setLabel`) et des flèches (`edgeTexts.ts`) ; troika : un texte finissant par `\n` passe par la
  mise en page riche (`troikaText.ts`). Fichiers : `src/engine/core/format/{richText,labelText,cellEdits,parse}.ts`,
  `src/engine/core/domains/edit/text/{textEdits,edgeTexts}.ts`, `src/engine/core/render/troikaText.ts`,
  `src/app/richEditor.ts`, `docs/SPEC.md` (§7.1 et édition avancée), `Makefile` (`DRAWIO_SVG`), fixture
  `tests/fixtures/empty-lines.drawio` (+ `drawio-saved/empty-lines.{drawio,svg}`), tests
  `tests/engine/core/render/emptyLinesFixture.test.ts`, `tests/engine/core/domains/edit/text/textEdits.test.ts`,
  `tests/engine/core/format/{richText,labelText,editing}.test.ts`, `tests/engine/core/render/richLayout.test.ts`.
  Changements de comportement : texte d'un label `html=1` lu avec les espaces fusionnés et les lignes coupées comme
  à l'affichage (avant : espaces doublés gardés) ; retours à la ligne littéraux d'un label HTML = lignes (avant :
  espaces dans le texte riche) ; HTML indenté (blancs entre blocs) sans ligne vide parasite ; texte de forme fait
  seulement de blancs vidé ; ligne vide finale écrite `<div><br></div>`. Validation : `make check` vert,
  `make drawio-check` vert (draw.io réenregistre la fixture sans changer les textes ; même nombre de lignes que son
  export SVG pour chaque forme et flèche, texte brut de flèche centré sur 5 lignes). Vérifié seulement par les tests :
  tout le rendu (pas d'appli ouverte) et l'éditeur en place (pas de test DOM). À l'œil : ouvrir
  `tests/fixtures/empty-lines.drawio` — rangée du haut (`html=1`) et du milieu (texte brut) : « a », ligne vide,
  « b », avec une ligne vide en tête et en fin là où le nom l'indique (`h-lead` : « a » sous le centre, `h-end` /
  `p-end` : « a » au-dessus du centre, `*-all`, `h-editor`, `h-rich`, `h-literal` : « a » et « b » au-dessus et
  au-dessous du centre, à une ligne vide d'écart) ; flèches `e-html` / `e-plain` : « a » au-dessus du trait,
  « b » au-dessous ; `e-start` : texte de début avec une ligne vide en tête et en fin ; comparer à la même fixture
  dans draw.io. Puis éditer une forme et une flèche : saisir une ligne vide en tête, « a », ligne vide, « b », ligne
  vide en fin, valider, rouvrir l'édition et recharger : les lignes vides restent.
