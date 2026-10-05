# Point d'ancrage libre à l'arrivée

> Itération — flèches (points d'ancrage) ; reprise de 108

- À la création d'une flèche par une poignée de connexion, lâcher dans une forme (et non sur un de ses points)
  ne fait plus une attache auto : l'arrivée prend le **point libre** de la cible le plus proche du point de départ,
  comme le départ prend le point libre de son côté le plus proche de la cible (`entryX/entryY` fixes).
- Pendant le glisser, ce point est cerclé sur la cible et l'aperçu y arrive.
- **Fini quand :** deux flèches tirées de deux formes vers l'intérieur d'une même cible y arrivent à deux points
  différents ; `make check` vert.
- Fait : `src/engine/Engine.ts` (`nearestFreeAnchor` partagé par le départ et l'arrivée ; une cible visée en
  attache auto devient une attache fixe sur son point libre le plus proche du départ, cerclé pendant le glisser),
  `docs/SPEC.md`. Vérifié dans l'appli (`sequences.drawio`) : deux flèches tirées du bas de « Client » dans
  « Base » partent de 0,5 et 0,75 et arrivent sur le côté gauche de « Base » à 0,5 puis 0,25 ; `make check` vert.
