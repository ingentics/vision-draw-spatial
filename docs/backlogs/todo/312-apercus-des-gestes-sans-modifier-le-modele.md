# Aperçus des gestes sans modifier le modèle en place, puis modèle gelé en dev

> Architecture du moteur — étanchéité des plugins ; reprise de 303. **À trancher avant de commencer** (ci-dessous).

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
