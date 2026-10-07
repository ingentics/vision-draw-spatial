# Rangement et nommage des fichiers du moteur

> Dette technique du moteur (lisibilité) ; après 207

- **Un nom de fichier n'est pris qu'une fois** dans `src/engine` (hors `index.ts`, `types.ts`, `registry.ts` et
  les fichiers internes d'une forme) : le fichier pur prend un nom qui dit son rôle (`interaction/camera.ts` →
  `cameraMath.ts`, `interaction/selection.ts` → `selectionRules.ts`…), un domaine de `core/` prend le nom de sa
  classe quand il le faut. Concernés : `arrange`, `camera`, `clipboard`, `controls`, `edgePoints`, `edit`,
  `graph`, `handles`, `highlight`, `history`, `jumps`, `label`, `labelPosition`, `minimap`, `move`,
  `orthogonal`, `pointer`, `selection`, `settings`, `shapes`, `styles`, `undo`.
- **Pas de fichier et de dossier du même nom** : `settings.ts` → `settings/index.ts`, `interaction/controls.ts` →
  `interaction/controls/index.ts`.
- **Fichiers mal placés** : `pageGeometry` (et ce qui va avec) sort de `edit/anchoring/auto/distribute.ts` vers
  `model/` ; `edit/autosave.ts` rejoint `persistence/`.
- Une ligne d'en-tête par dossier du moteur (pur ou avec état) dans `docs/SUMMARY.md` §3 ; SPEC §4.2 et les guides
  (`SUMMARY`, `AJOUTER_*`, `COMPOSANT`) suivent les nouveaux chemins. Les tests suivent au chemin miroir.
- Aucun changement de comportement : seuls les chemins, noms de fichiers et imports changent.
- **Fini quand :** la recherche des noms en double ne trouve plus que les exceptions ; `make check` vert ; l'appli
  se charge et fonctionne comme avant sur le serveur partagé.
- Fait : 31 fichiers renommés (et leurs 21 tests miroirs), imports réécrits par résolution des chemins :
  `settings.ts` → `settings/index.ts`, `interaction/controls.ts` → `interaction/controls/index.ts` ; côté pur,
  `interaction/{cameraMath, navigationHistory, transitionMath, minimapLayout, selectionRules}`,
  `edit/{handleKinds, undoStack, labelPlaces, stylePresets, edgePointEdits, moveSet}`,
  `edit/anchoring/auto/{anchorArrangement, routeAround}`, `format/{clipboardCells, labelText, cellEdits}`,
  `modes/{modeEdits, modeShapes}`, `model/navigationGraph`, `render/{handleMeshes, veil}`,
  `shapes/minimapOutline`, `render/edges/route/perimeters/shapePerimeters` ; côté `core/`, au nom de la classe :
  `input/{cameraControls, pointerInput}`, `edit/shapeHandles`, `edit/edges/{edgeHandles, edgeJumps}`.
  `pageGeometry` sorti dans `model/pageGeometry.ts` ; `edit/autosave.ts` → `persistence/Autosaver.ts`. Plus aucun
  nom en double hors `index.ts`, `types.ts`, `registry.ts` et fichiers internes des formes (`facade.ts`,
  `figure.ts`). Docs : SPEC §4.2 (arborescence réécrite d'après le code), `SUMMARY` §3 (une ligne par dossier,
  pur ou avec état), chemins cités dans la SPEC, `SUMMARY`, `AJOUTER_UNE_FORME` et les commentaires. Aucun
  changement de comportement. Vérifié : `make check` ; appli rechargée sur le serveur partagé (cache de Vite :
  fichiers qui importent `settings` et `interaction/controls` touchés), fixture `shapes` et `docs/test.drawio`.
