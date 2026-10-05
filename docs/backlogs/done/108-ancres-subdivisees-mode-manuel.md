# Points d'ancrage subdivisés (mode manuel)

> Itération — flèches (points d'ancrage) ; reprise de 106. Premier des deux modes d'ancrage (le second viendra
> ensuite, avec le choix du mode).

- Aujourd'hui une forme n'a qu'un point d'ancrage par côté (le milieu) : toutes les flèches d'un côté partent et
  arrivent au même point.
- Mode manuel : sur chaque côté, les ancres déjà prises par des flèches (`exitX/exitY` ou `entryX/entryY` sur le
  bord du cadre) restent, et un **point libre** est proposé au milieu de chaque intervalle entre les coins et ces
  ancres. Sans flèche : le milieu (0,5) ; une flèche au milieu : 0,25 et 0,75 libres ; puis 0,125 et 0,375, etc.
  Calcul dynamique, à chaque glisser ; le bout déplacé ne compte pas comme pris.
- Repères sur la forme visée : croix sur les points libres, disque plein sur les ancres prises ; tous accrochables.
  Positions projetées sur le contour de la forme (ellipse, losange…), comme le tracé.
- Poignée de connexion d'un côté : la flèche part du point libre de ce côté le plus proche de la cible visée.
- **Fini quand :** tirer deux flèches depuis la poignée du bas d'une forme les fait partir de deux points
  différents (0,5 puis 0,25 ou 0,75) ; en visant une forme qui a déjà une flèche au milieu d'un côté, les points
  libres 0,25 et 0,75 sont proposés ; `make check` vert.
- Fait : `src/engine/edit/edgeEnds.ts` (`freeAnchorPositions`, `shapeAnchors` : ancres prises par côté + points
  libres au milieu des intervalles ; anciens `CONNECTION_POINTS` / `connectionPoints` retirés),
  `src/engine/Engine.ts` (accroche et repères sur les ancres dynamiques, positions projetées sur le contour via
  `fixedAnchor`, bout déplacé exclu ; poignée de connexion : départ au point libre du côté le plus proche de la
  cible), `src/engine/render/handles.ts` (croix = libre, disque plein = pris), `tests/engine/edit/edgeEnds.test.ts`.
  Vérifié dans l'appli (`sequences.drawio`) : deux flèches tirées depuis le bas de « Client » vers « Base » partent
  de 0,5 puis de 0,75 ; `make check` vert.
