# Métriques : un export PNG compte comme une construction de scène

> Itération — moteur, export d'image et métriques ; dette vue à l'audit 444 (reprise de 431)

- Constat : `ImageExport.exportPng` (`view/imageExport.ts`) construit sa scène par `SceneView.buildScene`, qui note
  sa durée dans les métriques (`metrics.sceneBuilt`, `scene.ts`). Un export remplace ainsi, dans les Diagnostics, la
  durée de construction de la scène affichée de la page.
- Ce qu'on veut : `SceneView.buildDetachedScene(page, level)` construit une scène hors de la vue, sans la compter.
  L'export s'en sert ; `buildScene` (scènes de la vue) garde la mesure.
- Écart de comportement : la durée de construction des Diagnostics reste celle de la scène affichée après un export.
- Tests : `imageExport.test.ts` adapté (scène construite hors de la vue) ; test de `SceneView` : la scène hors vue
  n'écrit pas de métrique.
- **Fini quand :** testé ; un export PNG fonctionne comme avant dans l'appli.
- Fait : `SceneView.buildDetachedScene` (`view/scene.ts`) construit la scène sans mesure ; `ImageExport.exportPng`
  s'en sert. Tests : `tests/engine/core/domains/view/scene.test.ts` (nouveau : scène de la vue comptée, scène hors
  vue non) ; `imageExport.test.ts` adapté au nom de la méthode. `make check` vert. Vérifié dans l'appli : export PNG
  de `states.drawio` (849 × 525, nommé `states-Machine à états.png`).
