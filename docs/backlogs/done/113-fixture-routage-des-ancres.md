# Fixture du routage des points d'ancrage

> Itération — flèches (points d'ancrage) ; reprise de 108 à 111

- Nouvelle fixture `tests/fixtures/anchor-routing.drawio`, générée par son test (`WRITE_FIXTURES=1`), qui couvre
  les combinaisons du routage par points d'ancrage : les 16 couples côté de départ × côté d'arrivée sur des ancres
  hors milieu (0,25 / 0,75) dans quatre positions de cible ; plusieurs flèches sur un même côté (éventails,
  subdivision 0,125 … 0,875) ; les 16 boucles côté × côté (coudes de `loopWaypoints`) et des boucles hors milieu.
- Validée contre draw.io : ajoutée aux exports SVG de `make drawio-check`, chaque tracé doit tomber au pixel près
  sur celui de draw.io ; aucune boucle ne traverse sa forme.
- **Fini quand :** la fixture s'ouvre dans l'appli et dans draw.io avec les mêmes tracés ; `make check` et
  `make drawio-check` verts.
- Fait : `tests/fixtures/anchor-routing.drawio` (172 flèches : 128 couples de côtés hors milieu, 5 éventails dont
  subdivisions au 1/8, 23 boucles), générée par `tests/engine/render/edges/anchorRoutingFixture.test.ts` (à jour,
  aucune boucle ne traverse sa forme, tracés comparés à l'export SVG de draw.io) ; `Makefile` (`DRAWIO_SVG`) ;
  `drawio-saved/anchor-routing.{drawio,svg}`. Les 172 tracés tombent au pixel près sur ceux de draw.io 24.7.5 ;
  ouverte dans l'appli (445 formes, 172 flèches) ; `make check` et `make drawio-check` verts.
