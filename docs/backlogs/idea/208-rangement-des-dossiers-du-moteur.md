# Rangement et nommage des dossiers du moteur

> Idée — dette technique du moteur (lisibilité) ; après 207

- La séparation logique pure (`edit/`, `interaction/`, `format/`) / état (`core/`) est bonne mais les noms ne la
  disent pas : homonymes `interaction/camera` / `core/view/camera`, `interaction/history` /
  `core/navigation/history`, `interaction/transitions` / `core/navigation/transition`, `interaction/minimap` /
  `core/view/minimap`, `interaction/selection` / `core/selection/selection`, `interaction/controls` /
  `core/input/controls`, `edit/handles` / `core/edit/handles` / `render/handles`, `edit/undo` /
  `core/document/undo`, `edit/labelPosition` / `render/labelPosition`, `render/highlight` /
  `core/selection/highlight`. `interaction/camera.ts` est de la géométrie de caméra, pas de l'interaction.
- Fichiers mal placés : `pageGeometry` (dans `edit/anchoring/auto/distribute.ts`, utilisé par le document et le
  glisser) ; `persistence/` et `edit/autosave.ts`, utilisés seulement par l'app.
- Au minimum, une ligne d'en-tête par dossier (pur ou avec état) ; au mieux, renommer pour refléter le rôle.
