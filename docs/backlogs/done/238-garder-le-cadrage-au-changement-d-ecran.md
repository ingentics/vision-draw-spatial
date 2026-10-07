# Garder le cadrage quand on change d'écran

> Itération — caméra (viewport) ; `src/engine/core/runtime/display.ts`

- Aujourd'hui, quand le canvas change de taille, la caméra garde son zoom en pixels CSS : en passant d'un petit écran
  (portable) à un écran de plus forte résolution, la fenêtre compte bien plus de pixels CSS et on voit beaucoup plus
  du schéma, comme si on avait dézoomé.
- Au changement d'écran, on garde la même portion du schéma à l'écran : même centre de vue, zoom multiplié par
  `min(nouvelle largeur / ancienne largeur, nouvelle hauteur / ancienne hauteur)` du viewport (la zone vue avant
  reste entièrement visible et remplit le nouvel écran), dans les limites de zoom de la caméra, orientation inchangée.
  Retour sur le petit écran : même règle, on retrouve le cadrage de départ (zoom de départ
  mémorisé si la vue n'a pas bougé entre-temps : les deux rapports ne s'annulent pas quand les écrans n'ont pas les
  mêmes proportions).
- Un changement d'écran se reconnaît à un changement de `window.screen` (largeur / hauteur) ou de `devicePixelRatio`
  entre deux mesures du canvas. Un simple redimensionnement de la fenêtre sur le même écran garde le comportement
  actuel (zoom constant, comme draw.io).
- Pas d'étape d'annulation (c'est la vue, pas le document) ; la minimap et l'éditeur de texte ouvert suivent.
- **Fini quand :** un schéma cadré sur l'écran du portable montre la même zone, à la même taille relative, une fois
  la fenêtre passée sur l'écran externe (et inversement) ; redimensionner la fenêtre sur un même écran ne change pas
  le zoom ; `make check` vert.
- Fait : `Display.resize` (`core/runtime/display.ts`) compare l'écran de chaque mesure (`window.screen` largeur ×
  hauteur, `devicePixelRatio`) à la précédente ; s'il a changé, le zoom est multiplié par `keptFramingFactor` (plus
  petit des rapports de taille du viewport), centre et orientation gardés, limites par `setCameraState` ; le dernier
  changement est mémorisé pour retrouver le zoom exact au retour si la vue n'a pas bougé. Minimap et éditeur de texte
  recalés. Test `tests/engine/core/display.test.ts`. Limite : une fenêtre passée sur un autre écran sans changer de
  taille ni de densité n'est vue qu'au redimensionnement suivant. Non vérifié sur deux écrans réels (pas de second
  écran dans le navigateur intégré).
