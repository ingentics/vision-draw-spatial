# Mot de la tranche aussi sur le dessus en iso / 3D

> Itération — formes (Architecture) ; reprise de 157

- En iso / 3D, le mot d'un process étiqueté s'écrit aussi sur le dessus du bloc, dans la tranche, comme en 2D, en
  plus des façades.
- **Fini quand :** en iso et en 3D, le mot apparaît dans la tranche du dessus et en bas à droite de chaque face ;
  `make check` vert.
- Fait : `shapes/generic/tagged-process/index.ts` : le rendu iso reprend le bloc avec lignes et mot sur le dessus
  (dessin intérieur complet, comme en 2D) et y ajoute les étiquettes de façade ; SPEC §8.3 à jour. Vérifié dans
  l'appli en iso : « API » dans la tranche du dessus et en bas à droite des faces visibles.
