# Flèches des poignées de connexion en iso et en 3D

> Itération — sélection (poignées de connexion)

- En vue iso et 3D, la flèche des disques de connexion nord et ouest se réduit à un trait : la pointe passe sous le
  disque. Three.js trie les objets transparents de même `renderOrder` par profondeur du centre de leur géométrie, et
  la pointe, décalée vers l'extérieur, est plus loin de la caméra que le centre du disque.
- L'ordre de dessin des poignées ne doit plus dépendre de la caméra : disque, puis flèche par-dessus.
- **Fini quand :** en iso et en 3D, les quatre disques de connexion montrent une flèche complète, quelle que soit la
  rotation ; test de non-régression ; `make check` vert.
- Fait : `src/engine/render/handles.ts` — le groupe des poignées porte l'ordre de dessin (`renderOrder` de groupe au
  maximum) et ses pièces gardent `PART_ORDER` (fonds puis traits), au lieu d'un même `renderOrder` pour toutes.
  Test `tests/engine/render/handles.test.ts`. Vérifié dans l'appli : en iso, le groupe des poignées a l'ordre max,
  fonds à 0 et traits à 1.
