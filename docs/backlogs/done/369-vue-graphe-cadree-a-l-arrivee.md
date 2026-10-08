# Vue graphe cadrée en entier à l'arrivée

> Itération — vue graphe (SPEC §12), reprise de 367

- En arrivant sur la vue graphe, la caméra fait une **vue globale** : tout le graphe cadré (comme Entrée), dans
  l'orientation d'arrivée habituelle, au lieu de la dernière vue mémorisée du graphe. Vaut pour l'onglet « Vue
  graphe », le raccourci graphe ↔ page et « Retour » depuis une page ouverte depuis le graphe.
- Le rechargement à chaud (`devSession`) garde sa restauration de caméra.
- SPEC §12 mise à jour.
- **Fini quand :** dans l'appli, sur `parent-pages.drawio`, zoomer ou se déplacer dans la vue graphe, ouvrir une page,
  revenir par l'onglet ou par Retour : le graphe entier est cadré.
- Fait : `GraphView.overviewCamera` (`domains/view/graph.ts`, cadrage de toute la page graphe dans l'orientation
  d'arrivée) utilisé par `showGraph` (onglet, raccourci) et par `History.returnTo` quand la page de retour est la vue
  graphe (`domains/navigation/history.ts`) ; la caméra mémorisée du graphe n'est plus reprise. SPEC §12. Vu dans
  l'appli sur `parent-pages.drawio` : zoom dans le graphe, plongée dans « Accueil », retour par l'onglet → graphe
  entier cadré. « Retour » non essayé à l'œil (même cadrage, même fonction).
