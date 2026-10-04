# Zone de texte définie par la forme, selon le mode

> Itération — formes (rendu du label et édition du texte) ; lié à 57 (« Ajuster » réduit le texte dans cette zone)

- **Une zone de texte par forme et par mode** (`flat`, `iso`, `volume`) : la définition d'une forme
  (`ShapeDefinition`, `render/shapes/types.ts`) peut fournir la zone de son texte, un rectangle en coordonnées page
  calculé à partir de ses bornes et de son style. **Par défaut, c'est le cadre de la forme** (ses bornes), comme
  aujourd'hui ; les marges `spacing*` s'appliquent ensuite dans cette zone.
- **La zone d'édition est la zone d'affichage** (le but du sujet) : en double-cliquant, l'éditeur s'ouvre exactement
  là où le texte est dessiné, à la même largeur de retour à la ligne, dans tous les modes ; valider l'édition ne
  déplace pas le texte.
- **Une seule source pour tout ce qui place le texte** : le rendu du label (`createLabel`), l'éditeur en place
  (`LabelEditRequest.screen`), le retour à la ligne (`whiteSpace=wrap` : largeur de la zone), et le calcul
  « Ajuster » de 57. Aujourd'hui `storage.ts` calcule une zone pour le rendu 2D seulement (`CylinderDrawing.label`) :
  elle passe par ce mécanisme commun.
- **Zones de départ (mode 2D)**, avec `boundedLbl=1` (posé par la palette), comme draw.io :
  - **BDD** (`shape=cylinder3`) : le corps, sous l'ellipse du haut (de `2·dy` en haut à `0,3·dy` en bas) ;
  - **Queue** (`shape=cylinder3;direction=south`) : le corps, à gauche du bout visible (la même zone tournée :
    `2·dy` retirés à droite, `0,3·dy` à gauche).
  - **Cache distribué** (`shape=datastore`) : le corps, sous les trois anneaux (de `3·dy` en haut, sous la dernière
    lèvre, à `0,3·dy` en bas). La palette ajoute `boundedLbl=1` à son style (elle ne le met pas aujourd'hui) ;
    vérifier avec `make drawio-check` si draw.io place lui aussi le texte sous les anneaux et noter l'écart s'il
    ne le fait pas.
  - Sans `boundedLbl`, la zone reste le cadre entier (fichiers draw.io qui ne le mettent pas).
- **Modes iso et volume** : la zone par défaut reste celle du rendu actuel (toit des bâtiments pour BDD, queue et
  cache) ; le mécanisme permet de la redéfinir mode par mode plus tard.
- **Fini quand :** en 2D, une BDD, une queue et un cache tirés de la palette affichent leur texte centré dans le corps
  (pas sur l'ellipse, le bout ni les anneaux) ; à l'édition (double-clic), le texte de l'éditeur se superpose au texte
  affiché (même position, mêmes retours à la ligne) en 2D comme en iso et en volume, et ne bouge pas à la validation ;
  un rectangle n'a pas changé ; redimensionner la forme garde l'ellipse hors de la zone ; tests de la zone de texte
  (défaut, BDD, queue, cache, sans `boundedLbl`) ; `make check` vert.
- Fait : `ShapeDefinition.textZone(shape, level)` (`render/shapes/types.ts`) et `ShapeRegistry.textZone` (niveau
  dessiné par la forme, repli sur `flat`, bornes par défaut). `storage.ts` : BDD et queue gardent leur zone
  `boundedLbl` (`boundedLabel`), le cache a la sienne ; `textZone` des trois cylindres = zone du tracé 2D, bornes en
  iso. `Engine.labelEditScreen` ouvre l'éditeur d'une forme sur `registry.textZone` au niveau de la scène
  (`screenRectOf` prend une zone). **Cache** : l'export SVG de draw.io montre que draw.io place toujours le texte
  sous les anneaux, `boundedLbl` ou non (zone à `2,5·dy` du haut, sans marge en bas) : on fait pareil, sans toucher
  au style de la palette. SPEC §8.3 (stockage) mise à jour. Tests : `tests/engine/render/storage.test.ts` (zones
  BDD, queue, cache, sans `boundedLbl`, iso, label du cache centré comme dans draw.io). Vérifié dans l'appli en 2D :
  BDD, queue et cache de la palette affichent leur texte dans le corps, et le texte de l'éditeur se pose exactement
  dessus, sans bouger à la validation. **Pas fait** : en iso et en volume, l'éditeur reste un cadre horizontal sur
  l'emprise écran du toit, alors que le texte dessiné suit le toit en perspective : repris en 61.
