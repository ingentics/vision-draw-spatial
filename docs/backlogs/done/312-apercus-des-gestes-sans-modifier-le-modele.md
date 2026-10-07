# Aperçus des gestes sans modifier le modèle en place, puis modèle gelé en dev

> Architecture du moteur — étanchéité des plugins ; reprise de 303. Décidé le 2026-10-07 : solution A.

- Le modèle donné aux plugins est typé en lecture seule (303), mais rien ne l'empêche à l'exécution d'être modifié.
  Le geler en dev et en test (pages gelées en sortie de `documentFromTree`) est impossible aujourd'hui : le tronc
  modifie lui-même le modèle en place pour ses aperçus en direct, par conception :
  - déplacement (`translateMoveSet`, `core/edit/moveSet.ts` ; `drag/move.ts` pour les bouts détachés) ;
  - redimensionnement (`drag/resize.ts`) ;
  - points d'une flèche (`drag/edgePoints.ts`) et bout d'une flèche (`applyEndAttachment`, `drag/edgeEnd.ts`) ;
  - texte en cours d'édition (`labelEditor.ts`) ;
  - ancrage automatique en direct (`edges/arrangement.ts`).
  L'essai (sujet 303) fait échouer 11 tests ; dans l'appli, un glisser lèverait une exception en dev.
- Choix à trancher :
  - **A** : les gestes travaillent sur une copie de la page (copie à l'écriture : la page et les seuls éléments
    touchés), que la scène affiche jusqu'au lâcher ; le modèle du document n'est plus jamais modifié en place, et ses
    pages sont gelées en dev et en test (une écriture d'un plugin lève alors une exception, protégée et signalée) ;
  - **B** : pas de gel à l'exécution : le typage en lecture seule suffit, les plugins étant dans le dépôt, vérifiés par
    `tsc` et la lint ; ce sujet est alors abandonné.
- **Fini quand (A) :** plus aucune écriture dans le modèle du document hors de sa relecture (recherche relue) ; pages
  gelées en dev et en test ; test : un mode et une forme de test qui modifient le modèle reçu, exception signalée,
  document inchangé ; tous les gestes vérifiés à l'œil dans l'appli (déplacement, redimensionnement, points et bouts
  de flèche, texte, ancrage automatique), annulation comprise ; `make check` vert.

- Fait (solution A) :
  - Copie de travail (`core/domains/document/file.ts`) : `livePage(pageId, owner)` remplace, au premier appel, la page
    du document par une copie modifiable (`structuredClone`), reprend la sélection sur ses éléments
    (`Selections.rebind`, événement `selectionChange`) et la rend aux appels suivants ; `settleLivePage(owner)` la
    rend : quand tous ses détenteurs l'ont rendue, la copie, conforme à l'arbre, devient la page du document et est
    gelée. Une copie d'une autre page est d'abord close ; une relecture du document (`replaceDocument`,
    `documentChanged`) l'abandonne.
  - Gel : `freezeModel` (`core/model/freeze.ts`) gèle en profondeur les pages tenues par le document, en dev et en
    test seulement (`import.meta.env.DEV`) ; en production, rien ne change. Les relectures temporaires de l'arbre
    (remises en ordre, répartition) restent modifiables : seules les pages du document sont gelées.
  - Branchés sur la copie : le suivi du pointeur de tous les glisser (`DragGesture.moveTo` : déplacement,
    redimensionnement, points et bouts de flèche, connecteur, texte d'une flèche, partie d'une forme), le déplacement au
    clavier, l'aperçu du nom d'une forme qui place son texte (région RDD, `LabelEditor.previewLabel`), l'autre
    agencement de l'ancrage automatique (touche F). `DragGesture.endMove` rend la copie après l'écriture (même en cas
    d'erreur) ; l'éditeur de texte la rend à sa fermeture.
  - Défaut trouvé et corrigé pendant la vérification : valider un nom en cliquant ailleurs terminait aussi le glisser
    (`endMove`), qui fermait la copie de l'éditeur de texte ; l'éditeur écrivait ensuite dans une page gelée et le nom
    n'était pas enregistré. D'où les détenteurs de la copie (`owner`) : elle n'est close que par le dernier.
  - Relu : plus aucune écriture dans une page du document hors d'une copie de travail ou d'une relecture temporaire
    (recherche des affectations sur le modèle dans `core/`).
  - Comportement inchangé pour l'utilisateur.
  - Doc : `.claude/rules/coding.md` §3, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`, `SUMMARY.md`.
  - Tests :
    - `tests/engine/core/domains/document/file.test.ts` (nouveau) : pages du document gelées ; copie modifiable pendant
      le geste, original intact, copie gelée devenue la page à la fin ; copie partagée par deux détenteurs ; copie
      d'une autre page et relecture ;
    - `tests/engine/core/model/freeze.test.ts` : un mode qui écrit dans la page reçue (habillage) et une forme qui
      écrit dans le style reçu (rendu) sur une page gelée : erreurs signalées, replis, page inchangée.
  - Validation dans l'appli (navigateur intégré, serveur 5173, gel actif), sans aucune erreur dans la console :
    - trois rectangles : déplacement d'une forme (la flèche suit), redimensionnement, segment de la flèche déplacé,
      bout rebranché sur une autre forme ; les quatre annulés, retour à l'état d'origine ;
    - région RDD : nom allongé en direct (l'onglet s'élargit), annulé par Échap ; puis validé en cliquant ailleurs,
      écrit et annulé ;
    - ancrage automatique : forme déplacée avec répartition en direct, touche F, déplacement au clavier ; annulés ;
    - page RDD : région déplacée avec ses tables, champ réordonné au glisser ; annulés.
    - Annulation d'un glisser en cours par Échap : non vérifiée à l'œil (les glisser simulés ne laissent pas presser
      une touche en cours de route) ; ses chemins remettent les valeurs dans la copie avant qu'elle soit rendue.
