# Lien vers la vue graphe en mode navigation sur une page sans parent

> Itération — mode navigation, reprise de 357

- Mode navigation (Espace maintenue) sur une page sans parent : au lieu de rien, un bouton « Vue graphe » (flèche
  vers le haut, icône de l'onglet Vue graphe) glisse depuis le haut comme les boutons des pages parentes ; un clic
  ouvre la vue graphe. Seulement quand la vue graphe existe (plusieurs pages) et hors de la vue graphe elle-même.
- **Fini quand :** sur la page d'accueil d'un fichier à plusieurs pages, Espace maintenue fait descendre le bouton
  « Vue graphe », un clic ouvre la vue graphe ; une page avec parents montre toujours ses parents ; un fichier d'une
  seule page n'affiche rien.
- Fait : `app/ParentPagesBar.tsx` (prop `onShowGraph` : bouton « Vue graphe », flèche ↑ et icône de l'onglet, même
  glissement que les parents), branché dans `Viewer.tsx` (plusieurs pages, hors vue graphe) ; icône extraite dans
  `app/GraphIcon.tsx`, partagée avec `PageTabs.tsx` (classes `.graph-icon`, `.graph-icon-hub`). SPEC §11.3 mis à
  jour. Vérifié à l'œil dans l'appli (Espace simulée) : le bouton descend sur la page sans parent, un clic ouvre la
  vue graphe. Fichier d'une seule page : lecture du code seulement.
