# Sélection de l'Actor en iso et en 3D : cercle de la tête

> Itération — sélection (Actor debout) ; reprise de 41

- En iso et en 3D, l'Actor sélectionné ne montre plus de rectangle posé au-dessus de son emprise (contour pointillé
  ou cadre des poignées) : la sélection est un cercle couleur d'accent autour de sa tête, face à la caméra comme la
  silhouette. Pointillé (et animé) en style « contour », plein en style « voile ».
- Pas de poignées de redimensionnement ni de connexion sur l'Actor debout (elles restent en 2D).
- **Fini quand :** en iso et en 3D, un Actor sélectionné montre un cercle autour de sa tête, qui suit la rotation de
  la caméra, sans rectangle ni poignées ; en 2D rien ne change ; `make check` vert.
- Fait : la silhouette debout expose le cadre de sa tête (`userData.head`, `actor/standing.ts`) ;
  `sceneView.standingHead` le lit en iso / 3D ; `headSelectionRing` (`render/decorations.ts`) dessine le cercle
  d'accent, face à la caméra (`userData.billboard`). `core/selection/highlight.ts` le pose à la place du contour
  (pointillé animé en style « contour », plein avec le voile) et n'affiche plus les poignées ; `core/edit/handles.ts`
  ne les saisit plus. Test dans `tests/engine/shapes/actor.test.ts`. Vérifié dans l'appli sur `flows.drawio` : en iso
  et en 3D, cercle autour de la tête, sans rectangle ni poignées.
