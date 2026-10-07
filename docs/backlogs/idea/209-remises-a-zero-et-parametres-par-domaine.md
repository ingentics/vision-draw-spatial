# Remises à zéro et paramètres gérés par chaque domaine du cœur

> Idée — dette technique du moteur (séparation des responsabilités)

- Chaque domaine de `core/` reçoit tout le cœur : `edit/drag/gesture.ts` touche 25 domaines, `input/controls.ts`
  et `document/file.ts` 19, `input/pointer.ts` 18 ; une trentaine d'écritures directes dans l'état d'un autre
  domaine (`camera.animation` ×5, `pages.currentPageId` ×4, `pages.lastDocumentPageId`, `gesture.drag`,
  `labelEditor.editing`, `edits.editCount`, `display.pendingFit`…).
- `DocumentFile.load` remet à zéro une douzaine de domaines à la main (transitions, sélection, scènes, pages, graphe,
  geste, annulation, modes, historique, liens) : un `reset()` par domaine ou un événement interne de chargement.
- `Config.updateSettings` décide pour tous ce qu'il faut reconstruire (comparaisons clé par clé de `view.*`,
  `background`, `selection.accentColor`, `minimap.*`) : chaque domaine réagit plutôt à un changement de paramètres
  (`previous`, `next`).
- Écritures croisées remplacées par des méthodes du domaine propriétaire (`pages.setCurrent`,
  `camera.cancelAnimation`). Par petites étapes.
