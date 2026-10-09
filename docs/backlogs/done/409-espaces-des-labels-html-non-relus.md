# Espaces d'un label HTML gardés à la relecture

> Itération — texte riche (`format/richText.ts`) ; dette vue au sujet 407

- `richToHtml` écrit les espaces en tête, en fin ou doublés en `&nbsp;`, mais `parseRichHtml` les change en espaces
  ordinaires puis les fusionne et coupe les bouts de ligne : ils sont perdus à la relecture.
- Lecture : un espace insécable (`&nbsp;`, `\u00a0`) n'est ni fusionné ni coupé en bout de ligne ; il devient un
  espace ordinaire dans les lignes lues. Les espaces ordinaires restent fusionnés comme en HTML.
- Éditeur en place (`white-space: pre`) : ses espaces ordinaires comptent tous ; la lecture de son contenu les garde
  (option de `parseRichHtml`), sans quoi un double espace saisi disparaîtrait à la validation.
- **Fini quand :** un label HTML `&nbsp;a&nbsp; &nbsp;b&nbsp;` s'affiche avec ses espaces ; saisir deux espaces, un
  espace en tête et en fin dans l'éditeur en place, valider : ils restent à l'affichage et après enregistrement /
  réouverture ; fixture ; `make check` vert.
- Fait : `parseRichHtml` (`format/richText.ts`) garde les insécables jusqu'au bout de la lecture (ni fusionnés ni
  coupés), puis les lit en espaces ordinaires ; option `preserveSpaces` utilisée par `readContent`
  (`src/app/richEditor.ts`). `textToHtml` (`format/cellEdits.ts`) passe par `richToHtml` : espaces en tête, en fin ou
  doublés écrits en `&nbsp;`. Changements : un bloc fait d'un seul `&nbsp;` est une ligne d'un espace (plus une ligne
  vide) ; un double espace saisi dans l'éditeur est gardé. Tests dans `richText.test.ts` et `editing.test.ts` ; fixture
  `tests/fixtures/html-spaces.drawio`, vérifiée à l'œil ; saisie ` x  y ` dans l'éditeur en place relue à l'identique.
