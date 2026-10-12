# Metamorph : génération en échec, bibliothèque vide, annuler pendant la génération

> Audit 542 — appli et tronc (reprise de 538, 540)

- Constats :
  - `src/app/metamorph/metamorphHost.ts:25-30` : gestionnaire `metamorphRequest` `async` sans `try` ; un rejet de
    `server.generate` est une promesse non gérée et la forme reste « morphing » (`retry` / `reprompt` exigent `ready`).
    Idem `void registerAccepted()` (l.21, 23) et `void acceptMetamorph` (`ViewerContextPanel.tsx:150`).
  - `metamorphHost.ts:17` sort sans rien quand le serveur n'a aucune forme acceptée ; `demoShapeLibrary.ts:96` compte
    `METAMORPH_LIBRARY` parmi les bibliothèques connues : une forme `metamorph:*` absente reste « en chargement ».
  - `Metamorphs.results` (`core/domains/edit/metamorphs.ts:97-99`) écrit `ready` sans étape d'annulation ; annuler une
    modification faite pendant la génération remet `morphing`, et `documentShown` (l.165-170) saute la forme dont les
    propositions sont en mémoire : boutons grisés jusqu'à la réouverture (lu dans le code, à reproduire d'abord).
  - Paramètre `merge` de `Engine.setMetamorphInstructions` (`Engine.ts:440`) et `Metamorphs.setInstructions` (l.58)
    jamais passé par l'appli.
- Ce qu'on veut :
  - Un échec de génération rend la main : la forme revient à un état d'où « Réessayer » est possible (moteur averti
    par une opération d'échec, ou `metamorphResults` avec une erreur), message dans la console.
  - Les promesses de `metamorphHost` et `acceptMetamorph` attrapent leurs erreurs.
  - Bibliothèque Metamorph vide ou forme absente : les formes demandées sont déclarées introuvables
    (`markShapesUnavailable`), comme une bibliothèque inconnue.
  - `documentShown` aligne la mémoire sur l'état du fichier : une forme `morphing` dont les propositions sont en
    mémoire repasse `ready` (ou ses propositions sont oubliées et redemandées) ; choix à faire en écrivant le test.
  - `merge` branché sur la saisie en direct des instructions (comme les autres champs `live`), ou retiré.
- Écart de comportement : une génération en échec n'est plus bloquante ; une forme Metamorph introuvable est montrée
  « introuvable » ; annuler pendant une génération ne bloque plus la forme.
- Tests : `metamorphs.test.ts` (annuler / rétablir pendant et après la génération, échec) ; test de `metamorphHost`
  avec un serveur qui rejette et un serveur sans forme.
- Docs : COMPOSANT (événement `metamorphRequest` : que faire en cas d'échec), SPEC §8.3.
- **Fini quand :** dans l'appli, une génération qui échoue (serveur mocké forcé en erreur) laisse « Réessayer »
  disponible ; annuler une autre modification pendant la génération ne grise pas la forme ; `make check` vert.
