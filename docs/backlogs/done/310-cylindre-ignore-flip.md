# Le cylindre ignore `flipH` / `flipV`

> Dette relevée par l'audit du moteur (2026-10-07), avec le sujet 307

- Le cylindre (`shape=cylinder3` : BDD, queue) s'orientait à la main (`plugins/shapes/generic/cylinder/index.ts`) et
  ignorait `flipH` / `flipV` : une BDD `flipV=1` gardait son ellipse en haut, une queue `direction=south;flipH=1`
  son bout visible à droite, contrairement à draw.io.
- **Fini quand :** en 2D, les cylindres retournés sont dessinés comme dans draw.io (silhouette, lèvre, zone du
  texte) ; en iso, le sens de la queue suit son bout visible.
- Fait :
  - `generic/cylinder/index.ts` : l'orientation passe par `orientedPath` du tronc (`direction`, `flipH`, `flipV`,
    retournements échangés pour un cadre couché, comme draw.io), pour la silhouette, les lèvres et la zone du texte.
  - `architecture/queue/index.ts` : en iso, les chevrons vont vers le bout visible en 2D (`flowsLeft`, lu sur le
    tracé), et non plus seulement d'après `direction=north` ; sans ça, une queue retournée avait ses chevrons à
    l'envers de son dessin 2D.
  - Tests : `tests/engine/plugins/shapes/storage.test.ts` (BDD et queue retournées = miroir du tracé ; sens des
    chevrons pour south, south + flipH, south + flipV, north, north + flipH) ; le test des retournements échouait
    avant la correction.
  - Fixture `tests/fixtures/cylinder-flips.drawio` (BDD : normale, flipV, flipH, les deux ; queue : south,
    south + flipH, south + flipV, north + flipH ; effet forêt), réenregistrée par `make drawio-check`.
  - Vérifié à l'œil dans l'appli : en 2D, identique à l'export PNG de draw.io ; en iso, chevrons dans le sens du bout
    visible.
