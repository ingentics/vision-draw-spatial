# Simulation d'une machine à états : cadrer la suite, pas seulement l'état courant

> Itération — simulation du mode Machine à états (reprise de 462 et 467)

- Aujourd'hui la caméra ne garde que l'élément courant dans la vue (`keepInView`, glissement sans changer de zoom) :
  au lancement, on voit le départ mais pas la suite.
- **Cadrage** : la vue englobe l'élément courant et les éléments atteignables en 1 ou 2 transitions proposées (ceux où
  mènent les transitions proposées, puis les transitions proposées depuis eux). Centre sur leur emprise ; le zoom ne
  baisse que si l'ensemble ne tient pas (jamais de zoom avant), marge de 48 px (barres sur la zone de dessin).
- **Quand** : au lancement, dès qu'une de ces formes n'est pas entière dans la vue ; aux pas suivants (franchissement,
  Retour, Recommencer, clic dans la trace), seulement quand l'élément courant sort de la vue, comme avant.
- **Fini quand :** sur la fixture, zoomé sur le point d'entrée, « Lancer la simulation » recadre pour montrer l'entrée,
  l'état suivant et ceux d'après ; un pas qui reste dans la vue ne bouge pas la caméra ; un pas dont l'état courant
  sort de la vue recadre sur lui et sa suite ; `make check` vert.
- Fait : tronc, `PageTakeover.keepInView(shapeId, { around, whole })` (`core/modes/pageTakeover.ts`, type `KeepInView`
  exporté) et `ViewCamera.keepInView` (`core/domains/view/camera.ts`) : cadrage de la forme et de `around` par
  `fitBounds`, zoom plafonné au zoom courant, orientation gardée. Mode : `upcoming(sim)` (`simulationView.ts`, suite à
  2 transitions), `StatesSimulator.show` (`whole` au départ). Écart : un élément courant plus grand que la vue n'est
  plus seulement centré, la caméra dézoome pour le montrer entier. Doc : SPEC (Caméra de la simulation),
  `AJOUTER_UN_MODE.md`. Vérifié dans l'appli sur `states.drawio` : zoomé fort sur l'entrée, le lancement cadre l'entrée,
  State1, State2 et State3. Pas restant dans la vue sans mouvement : vérifié par les tests seulement
  (`simulationView.test.ts`, `statesSimulator.test.ts`).
