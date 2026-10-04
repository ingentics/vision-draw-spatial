# Étape 24 — Extrémités : d'où part et où arrive la flèche

> Milestone 6 — Moteur des flèches

- Flèche sélectionnée : une **poignée à chaque bout** du tracé.
- Tirer une poignée (comme draw.io) :
  - **sur l'intérieur d'une forme** (contour surligné) : attache **auto**, le moteur choisit le côté ; `source` /
    `target` écrit, `exitX/exitY/exitDx/exitDy` (ou `entry…`) retirés ;
  - **sur un point de connexion** : les **4 milieux de côtés** (petites croix affichées sur la forme survolée) ;
    attache **fixe**, `exitX/exitY` (source) ou `entryX/entryY` (cible) écrits ;
  - **dans le vide** : extrémité **libre**, `<mxPoint as="sourcePoint|targetPoint">` dans la géométrie, `source` /
    `target` retiré.
- La poignée de connexion d'une forme suit les mêmes règles à la création (lâcher sur un point de connexion = entrée
  fixe ; dans le vide = rien, comme aujourd'hui).
- Tracé recalculé en direct pendant le glisser.
- **Fini quand :** on change le départ et l'arrivée d'une flèche (auto, point fixe, libre), en 2D, iso et 3D, et
  draw.io affiche la même flèche.
- Fait : `edit/edgeEnds.ts` (points de connexion, attaches, aperçu sur le modèle), `setEdgeTerminal` dans
  `format/edit.ts`, poignées des bouts et repères d'accroche (`render/handles.ts`), glisser `edgeEnd` et connecteur à
  entrée fixe dans `Engine` ; testé à la main en 2D et en iso.
- Validé avec draw.io 24.7.5 : fixture `edge-ends.drawio` écrite par le moteur (`writeEndAttachment`), un cas par
  attache (auto, fixe, ellipse, libre au départ / à l'arrivée / des deux côtés, flèche dans un groupe) ;
  `make drawio-check` la fait réenregistrer (bouts conservés) et **exporter en SVG** : chaque bout tombe au pixel près
  sur celui de draw.io (`DRAWIO_SVG` du Makefile, test `edgeEndsFixture`).
