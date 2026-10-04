# Éditeur de texte en perspective en iso et en volume

> Itération — édition du texte ; reprise de 58 (zone d'édition = zone d'affichage)

- En iso et en volume, le texte d'une forme est dessiné sur son toit, en perspective ; l'éditeur en place s'ouvre
  aujourd'hui sur un cadre horizontal (l'emprise écran du toit) : le texte saisi n'est ni au même endroit, ni dans
  le même sens que le texte affiché.
- L'éditeur suit le plan du toit (transformation CSS de la zone de texte `registry.textZone` projetée à l'écran),
  avec la même taille, le même retour à la ligne et la même orientation que le label dessiné.
- **Fini quand :** en iso et en volume, au double-clic sur une forme (rectangle, BDD, queue, cache), le texte de
  l'éditeur se superpose au texte affiché et ne bouge pas à la validation ; la saisie et la sélection à la souris
  restent utilisables ; `make check` vert.
