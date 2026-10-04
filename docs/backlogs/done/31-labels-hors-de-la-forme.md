# Labels hors de la forme

> Milestone 5 — Formes géométriques (reste de l'étape 21)

- `verticalLabelPosition=bottom|top`, `labelPosition=left|right` dans `createLabel`, comme draw.io.
- En iso / 3D : label posé au sol à côté du volume (ou sous l'Actor).
- Nécessaire pour l'Actor (41) et les étoiles (39, 40).
- **Fini quand :** le label d'une forme se place dessous, dessus, à gauche ou à droite comme dans draw.io (fixture
  exportée par draw.io), en 2D, iso et 3D.
- Fait : `render/labelPosition.ts` : `outsideLabelBox` (cadre du label décalé d'une largeur / hauteur, comme
  `mxGraphView.updateVertexLabelOffset`) et `BASE_SPACING` (draw.io ajoute 5 px au-dessus d'un texte aligné en haut,
  1 px sous un texte aligné en bas, y compris dans la forme). `createLabel` prend la zone en paramètre et la remplace
  par ce cadre hors de la forme ; `ShapeRegistry.textZone` aussi (zone propre à la forme — `boundedLbl`, anneaux du
  cache — ignorée, comme draw.io). Iso / 3D : `createShapeObject` pose les labels hors de la forme au sol, sur la
  base de la forme (`groundOutsideLabels`) ; `Engine.labelTop` ouvre l'éditeur à cette hauteur. `LabelEditor` :
  marges haut / bas de draw.io, place « Ajuster » mesurée avec les marges réelles. Fixture `labels.drawio` (81
  combinaisons position × alignement, BDD et cache hors de la forme) exportée en SVG par draw.io (`DRAWIO_SVG`) :
  `tests/engine/render/labelsFixture.test.ts` vérifie chaque point d'ancrage contre draw.io (à 1 px), la zone de
  texte et la pose au sol en iso. SPEC §8.3 mise à jour. Vérifié dans l'appli : dessous, dessus, gauche, droite en
  2D ; au sol à côté du bloc en iso et en 3D, éditeur posé sur le texte. Pas d'interface pour choisir la position
  (fichiers draw.io seulement).
