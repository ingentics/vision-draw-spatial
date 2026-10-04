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
- Fait : `LabelEditRequest.plane` (`Engine.labelEditPlane`) : quand la vue n'est pas de dessus sans rotation (iso,
  3D, vue inclinée ou tournée), la zone de texte de la forme (`registry.textZone` au niveau de la scène) et ses
  quatre coins projetés à l'écran à la hauteur du toit, recalculés quand la vue bouge (`relocateLabelEdit`).
  `LabelEditor` pose alors sa boîte à la taille de la zone en pixels de page et la plaque sur ces coins par une
  homographie (`render/geometry/homography.ts`, CSS `matrix3d`), sans recadrage dans la vue ; le calcul
  « Ajuster » mesure la boîte sans sa transformation. Vue de dessus et flèches inchangées. SPEC §14.1 mise à
  jour. Tests : `tests/engine/render/homography.test.ts` (coins en perspective, cas affine, `matrix3d`). Vérifié
  dans l'appli sur `fixtures/storage.drawio` : en iso (queue « Flux ») et en 3D (cache « Sessions », texte
  allongé sur deux lignes), le texte de l'éditeur se superpose au texte dessiné et ne bouge pas à la validation ;
  double-clic sur un mot dans l'éditeur le sélectionne ; en 2D, rien ne change.
