# Remises à zéro et paramètres gérés par chaque domaine du cœur

> Idée — dette technique du moteur (séparation des responsabilités)

- Chaque domaine de `core/` reçoit tout le cœur : `gesture.ts` touche 24 domaines, `controls.ts` 19, `file.ts` 18 ;
  31 écritures directes dans l'état d'un autre domaine (`camera.animation`, `pages.currentPageId`, `gesture.drag`…).
- `DocumentFile.load` remet à zéro une dizaine de domaines à la main : un `reset()` par domaine ou un événement
  interne de chargement.
- `Config.updateSettings` décide pour tous ce qu'il faut reconstruire (liste manuelle de clés `view.*`) : chaque
  domaine réagit plutôt à un changement de paramètres (`previous`, `next`).
- Écritures croisées remplacées par des méthodes du domaine propriétaire (`pages.setCurrent`,
  `camera.cancelAnimation`). Par petites étapes.
