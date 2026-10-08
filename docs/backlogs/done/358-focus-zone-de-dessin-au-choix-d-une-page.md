# Focus sur la zone de dessin au choix d'une page

> Itération — onglets des pages (SPEC §14.1)

- Un clic sur l'onglet d'une page (ou sur « Vue graphe ») donne le focus à la zone de dessin : les raccourcis
  clavier (Espace, flèches, G…) agissent aussitôt, sans cliquer d'abord dans le dessin. Le double-clic pour renommer
  l'onglet ouvre toujours le champ.
- **Fini quand :** après un clic sur un onglet, Espace maintenue passe en mode navigation sans autre clic ; un
  double-clic sur l'onglet ouvre le renommage.
- Fait : `src/app/Viewer.tsx`, `onSelect` et `onShowGraph` des onglets (`PageTabs`) appellent `engine.focusCanvas()`
  après le changement de page. Vérifié dans l'appli : après un clic sur un onglet, le focus est sur le canvas de la
  zone de dessin.
