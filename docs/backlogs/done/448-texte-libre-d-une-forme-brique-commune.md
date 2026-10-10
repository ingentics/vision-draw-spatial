# Texte libre d'une forme (corps RDD, contenu d'état) en brique commune

> Audit 444 — moteur (API des plugins), RDD et Machine à états (reprise de 433)

- Constat : `states/state/bodyText.ts` recopie `rdd/tables/documentBody.ts:11-40` : `BODY`, `BODY_PART`,
  `bodyValue` (chaîne JSON aux `;` échappés), lecture tolérante d'une valeur qui n'est pas du JSON, normalisation
  (fins de ligne, tabulations en deux espaces). Les commentaires sont recopiés aussi. Les deux copies ont déjà
  divergé : `text.trim() ?` côté états, `text ?` côté RDD.
- Ce qu'on veut : une brique de l'API des plugins, `core/plugins`, pour lire, écrire et normaliser un texte
  multiligne rangé dans une clé `spatial.<mode>.*`. RDD et États s'en servent ; chacun garde sa clé et sa partie.
- Écart de comportement : un corps RDD fait seulement d'espaces est retiré, comme le contenu d'un état. Ce cas est
  invisible.
- Tests : ceux de `documentBody.test.ts` et `stateBody.test.ts` restent verts ; test de la brique côté moteur.
- Doc : `AJOUTER_UN_MODE.md`, briques des parties.
- **Fini quand :** l'édition sur place du corps d'un document RDD (`rdd-document.drawio`) et du contenu d'un état
  (`states.drawio`) se comporte comme avant, `;` et retours à la ligne compris.
- Fait :
  - Nouvelle brique `modeText(keys, nom)` (`core/modes/modeText.ts`), exportée par l'API des plugins avec le type
    `ModeText`. Elle offre `read`, `normalize`, `value` (valeur à écrire, `undefined` pour un texte vide ou blanc) et
    `preview` (forme d'aperçu portant le texte).
  - RDD (`rdd/tables/documentBody.ts`, `editing/fieldParts.ts`) et États (`states/state/bodyText.ts`, `stateBody.ts`,
    `index.ts`) passent par leur `BODY_TEXT`. Les copies de `bodyValue`, de la lecture JSON, de la normalisation et
    des deux `withBody` d'aperçu sont retirées.
  - Doc : `AJOUTER_UN_MODE.md` (clés). `guides.test.ts` lit les membres de `modeText.ts` comme un contrat.
  - Écart : un corps RDD fait seulement d'espaces est retiré, comme le contenu d'un état (avant : gardé). C'est
    invisible.
  - Tests : `tests/engine/core/modes/modeText.test.ts` (nouveau). Ceux de RDD et des états sont inchangés.
  - `make check` vert.
  - Vérifié dans l'appli (`states.drawio`) : le contenu de State2, saisi sur place avec un `;`, est écrit et relu tel
    quel, sur ses lignes, puis annulé.
