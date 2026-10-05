# Fixture du routage en ancrage automatique

> Itération — flèches (points d'ancrage) ; reprise de 113 et 114

- Fichier dédié `tests/fixtures/anchor-auto-routing.drawio`, page en ancrage automatique
  (`spatial.anchoring="auto"`), généré par son test (`WRITE_FIXTURES=1`) : les flèches ne donnent que leurs côtés,
  la répartition du moteur (`distributeAnchors`) écrit les points. Cas : éventails de 1 à 5 flèches sur un côté,
  flèches sur les quatre côtés d'une forme, flèches parallèles entre deux formes, satellites déclarés dans le
  désordre (pas de croisement), départs et arrivées sur un même côté, boucles mêlées à d'autres flèches.
- Validé contre draw.io (ajouté aux exports SVG de `make drawio-check`) ; la répartition y est stable (la relancer
  ne change rien).
- **Fini quand :** la fixture s'ouvre dans l'appli et dans draw.io avec les mêmes tracés ; `make check` et
  `make drawio-check` verts.
- Fait : `tests/fixtures/anchor-auto-routing.drawio` (59 flèches, 18 cas : éventails de 1 à 5 sur le haut et de 2 à 5
  depuis le bas, quatre côtés, parallèles aller-retour, satellites dans le désordre, départs et arrivées mêlés,
  cinq cas de boucles), générée par `tests/engine/render/edges/anchorAutoRoutingFixture.test.ts` (répartition du
  moteur appliquée jusqu'à stabilité, coudes des boucles par `loopWaypoints`) ; `Makefile` (`DRAWIO_SVG`) ;
  `drawio-saved/anchor-auto-routing.{drawio,svg}`. Les 59 tracés tombent au pixel près sur ceux de draw.io 24.7.5,
  qui conserve `spatial.anchoring="auto"` ; ouverte dans l'appli (page en « Automatique ») ; `make check` et
  `make drawio-check` verts.
