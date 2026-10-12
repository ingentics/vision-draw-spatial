# Élévation d'un calque

> Itération — calques (reprise de 523)

- Un calque a une élévation, en pixels, **0 par défaut**, écrite `spatial.elevation=N` dans le style de sa cellule
  (retirée à 0 ou vide) ; nombre positif, comme l'élévation d'une forme.
- En vue iso et 3D, tout le contenu du calque monte de cette hauteur : une forme posée sur le calque a pour base
  l'élévation du calque plus la sienne (`spatial.elevation`), son contenu suit ; une flèche du calque est au moins à
  cette hauteur. À plat (vue de dessus), rien ne change. Clic, poignées et sélection suivent (ils lisent la scène).
- Section « Calques », en vue iso ou 3D seulement : un champ « Élévation » par calque (vide = 0), une étape
  d'annulation « Élévation du calque » par saisie validée ; désactivé si la page n'est pas modifiable.
- **Fini quand :** en iso, sur `fixtures/layers.drawio`, on règle l'élévation d'un calque : son contenu flotte à
  cette hauteur, les autres calques restent au sol ; le champ n'apparaît pas en vue de dessus ; annuler le ramène.
- Fait : `LayerModel.elevation` lu du style du calque (`format/cellIndex.ts`), écrit par `setLayerElevation`
  (`format/layerEdits.ts`) ; sol de chaque élément = élévation de son calque dans `volumeLayout`
  (`render/pageScene.ts`) ; domaine `PageLayers.setLayerElevation` (étape « Élévation du calque »), façade
  `Engine.setLayerElevation` ; champ par calque en iso / 3D (`LayersSection.tsx`, `viewMode` passé au panneau).
  Tests : `layerEdits`, `pageLayers`, `spatial` (scène iso). Vérifié à l'œil en iso sur `fixtures/layers.drawio`
  (contenu élevé, autre calque au sol, champ absent en 2D, annulation) ; 3D non regardée.
