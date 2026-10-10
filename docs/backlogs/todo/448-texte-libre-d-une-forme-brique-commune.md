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
