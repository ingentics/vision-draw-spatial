# Limites de caméra propres à chaque moteur

> Dette technique du moteur (caméra)

- `interaction/camera.ts` garde au niveau du module un objet `limits` mutable (`setCameraLimits`, appelé par
  `Config.applyCameraLimits`) : tous les `Engine` d'une même page partagent les bornes de zoom, d'inclinaison et le
  champ de vision, et des tests peuvent s'influencer.
- Porter ces limites par `ViewCamera` et les passer en paramètre aux fonctions de caméra ; supprimer l'état de
  module.
- **Fini quand :** plus aucun état mutable dans `interaction/camera.ts` ; les bornes réglées dans les paramètres
  « Caméra » s'appliquent toujours (zoom 2D et 3D, inclinaison et champ de vision de la 3D) ; `make check` vert.
- Fait : `interaction/camera.ts` n'a plus d'état de module (`setCameraLimits` / `getCameraLimits` retirés) ; les
  bornes par défaut sont `DEFAULT_CAMERA_LIMITS`, et les fonctions qui en dépendent (`clampZoom`, `clampTilt`,
  `normalizeCameraState`, `settleProjection`, `perspectiveAmount`, `fitBounds` via `options.limits`, `defaultView`,
  `applyPerspectiveState`, `zoomAt`, `tiltAround`, `orbit`, `withViewMode`) les reçoivent en dernier paramètre.
  `ViewCamera.limits` les calcule depuis `settings.camera` (mémorisé tant que la section ne change pas) ; tous les
  appels du cœur les passent (caméra, modes de vue, niveaux, rendu, affichage, liens, retour, vue graphe,
  chargement), et les contrôles les obtiennent par `CameraHost.getCameraLimits`. `Config` ne fait plus que
  re-borner la caméra quand la section change. Test ajouté dans `tests/engine/interaction/camera.test.ts`
  (bornes passées appliquées, bornes par défaut intactes). Vérifié dans l'appli : zoom molette borné en 2D,
  passage en 3D ramené aux bornes 3D, rotation en 3D.
