# Arêtes arrière visibles pendant la bascule iso ↔ 3D

> Itération — caméra (projection en perspective) ; reprise de 29

- Pendant une bascule iso ↔ 3D, le champ de vision passe par `FLAT_FOV` (1°) : la caméra en perspective recule
  d'autant (≈ 57 fois plus loin qu'en 3D) mais son plan proche reste à 2 % de la distance. La précision en profondeur
  s'effondre et les arêtes arrière des volumes traversent le dessus des blocs.
- Le plan proche se cale juste devant ce qui peut être visible (même portée qu'en orthographique : taille de la vue
  / zoom / cos(inclinaison), plus une marge), sans descendre sous 2 % de la distance : la 3D à 45° est inchangée.
- **Fini quand :** pendant une bascule iso ↔ 3D (et en 3D avec un champ de vision de 2°), les arêtes arrière restent
  cachées ; `make check` vert.
- Fait : `applyPerspectiveState` (`src/engine/interaction/camera.ts`) cale le plan proche à `distance − portée − 1000`
  quand c'est plus loin que 2 % de la distance ; la portée (`visibleReach`) est partagée avec la caméra
  orthographique. Test dans `tests/engine/interaction/camera.test.ts` (plan proche serré à `FLAT_FOV`, coins de la vue
  au sol et en hauteur entre les plans). Vérifié dans l'appli, bascule ralentie iso → 3D → iso : arêtes arrière
  cachées tout du long.
