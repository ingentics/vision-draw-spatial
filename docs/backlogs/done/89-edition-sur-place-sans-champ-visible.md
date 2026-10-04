# Édition sur place sans champ visible

> Itération — interface (composant `InlineEdit`) ; reprise de 88

- En édition sur place (titre du flux dans la barre, nom d'une page dans son onglet), le champ ne se voit pas : même
  police, même place et même fond que le texte affiché, sans cadre ; seuls le curseur et la sélection montrent la
  saisie. Le champ prend la largeur de son texte (le titre de la barre reste centré).
- **Fini quand :** cliquer le titre du flux ou double-cliquer un onglet ne fait apparaître ni cadre ni fond, et le
  texte ne bouge pas ; `make check` vert.
- Fait : `InlineEdit` ajoute la classe commune `.inline-edit-input` (sans contour de focus, largeur du texte par
  `field-sizing: content`, police héritée) ; `.mode-bar-input` reprend la place et la police du titre affiché, sans
  cadre ni fond ; `.tab-input` perd sa largeur fixe (garde l'apparence de l'onglet actif). Vérifié dans l'appli : titre
  du flux et onglet « Séquences » en édition, texte sélectionné sur place, sans cadre.
