# Boutons des pages parentes en mode navigation

> Itération — navigation entre pages (« Retour », SPEC §11.3) et mode navigation

- Mode navigation (Espace maintenue) : en haut de la zone de dessin, un bouton par page parente de la page courante
  (page ayant un lien vers elle) glisse depuis le haut, et remonte de la même manière à la sortie du mode. Rien
  n'apparaît si la page n'a pas de parent.
- Chaque bouton porte une flèche vers le haut (couleur d'accent : on remonte), puis le titre de la page parente
  précédé de l'icône de son mode s'il en a une, même quand il n'y a qu'un parent ; ordre : la plus récemment utilisée
  d'abord (comme l'ancien menu de « Retour »).
- Un clic a l'effet de « Retour » vers ce parent : si la pile de navigation y ramène, on revient exactement à la vue
  d'origine (dépile) ; sinon on remonte par la forme qui porte le lien.
- Le bouton « Retour » de la barre du haut est retiré. Raccourci : Alt+↑ (remonter), fixe, à la place de Retour
  arrière (trop utilisé : le raccourci « Retour » configurable disparaît, Retour arrière ne fait plus que supprimer
  la sélection) et d'Alt+← (souvent déjà pris). Avec plusieurs parents et une pile vide, Alt+↑ fait apparaître ces
  mêmes boutons (au lieu du menu du bouton retiré) jusqu'au choix, Échap ou un clic ailleurs.
- **Fini quand :** sur une page liée depuis deux pages, Espace maintenue fait descendre deux boutons (icône + titre),
  le relâchement les fait remonter ; un clic sur l'un remonte vers cette page ; la page d'accueil (sans parent)
  n'affiche rien ; la barre du haut n'a plus de bouton « Retour » ; Alt+↑ remonte ;
  Alt+← et Retour arrière (sans sélection) ne font plus rien.
- Fait : `app/ParentPagesBar.tsx` (boutons, glissement de 150 ms, flèche ↑ en couleur d'accent, icône du mode,
  infobulle avec l'ancienneté du lien), branché dans `Viewer.tsx` ; `react/BackButton.tsx` et son menu supprimés.
  Moteur : `Engine.getParentPages()` ; `backTo` passe par la pile quand elle ramène à ce parent (vue d'origine
  exacte). Raccourcis (`interaction/controls/keyboard.ts`, `shortcuts.ts`) : Alt+↑ au lieu d'Alt+← ; le raccourci
  « Retour » configurable (`controls.shortcuts.back`) est supprimé, une valeur enregistrée est ignorée, et Backspace
  sans sélection ne fait plus rien. SPEC §9.2, §11.3, §13 et `COMPOSANT.md` mis à jour. Fixture
  `parent-pages.drawio` (une page à deux parents, dont un en mode Séquences). Vérifié à l'œil dans l'appli : boutons
  en mode navigation, clic, relâchement, Alt+↑ (choix, Échap), Retour arrière et Alt+← sans effet ; tests du
  raccourci de suppression ajustés. `make drawio-check` : la fixture réenregistrée par draw.io garde pages, liens et
  `spatial.mode`. Non vérifié : le clic quand la pile ramène au parent (lecture du code seulement).
