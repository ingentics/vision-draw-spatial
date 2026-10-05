# Tout sélectionner au clavier

> Itération — interaction (sélection) ; reprise de 60

- ⌘ + A (Ctrl + A hors macOS), le focus étant sur la zone de dessin, sélectionne tous les éléments de la page
  courante : formes sélectionnables et flèches, visibles, sur un calque visible ; un élément pris avec son
  conteneur n'est pas sélectionné à part (comme la sélection par zone).
- Pendant l'édition d'un texte (ou dans un champ), le raccourci garde son comportement natif (sélection du texte).
- **Fini quand :** après un clic dans la zone de dessin, ⌘ + A sélectionne tous les éléments ; dans l'éditeur de
  texte, ⌘ + A sélectionne le texte ; `make check` vert.
- Fait : `Engine.selectAll()` sélectionne les éléments sélectionnables de la page (liste et filtre « sans son
  conteneur » mis en commun avec la sélection par zone : `selectableItems`, `takenRoots`) ; `CameraController`
  traite ⌘ / Ctrl + A seulement quand la cible est la zone de dessin (canvas focalisé), ailleurs ou dans un champ
  le navigateur garde la main. Vérifié dans l'appli sur `fixtures/simple.drawio` : ⌘ + A → « 11 éléments »
  (6 formes, 5 flèches) ; en édition de texte, la sélection reste sur la forme éditée.
