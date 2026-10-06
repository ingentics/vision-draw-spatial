# Module de géométrie commun (Point, Rect)

> Dette technique du moteur (mutualisation)

- Fonctions réécrites localement : `distance` (stroke, polyline, controls/pointer), `center` (route/util,
  edgePoints, distribute), `contains` / `inside` (avoid, marquee, edgePoints, route/state), `insidePolygon` (pick,
  marquee, arguments dans l'ordre inverse), `segmentsCross` / `intersection` (octilinear, marquee, route/util,
  jumps), `unionOf` (align, effects/room), `simplifyPath` (avoid en égalité stricte, octilinear avec tolérance et
  colinéarité générale : à garder distincts ou paramétrer). Une quarantaine de `Math.hypot` à la main.
- Les rassembler dans un module unique (ex. `model/geometry.ts`) et les réutiliser.
- **Fini quand :** une seule implémentation de chacune de ces fonctions, dans `model/geometry.ts` ; comportement
  inchangé (tests verts) ; `make check` vert.
- Fait : nouveau `src/engine/model/geometry.ts` : `distance`, `center`, `rectContains`, `boundsOfPoints`,
  `unionOf`, `cross`, `segmentsCross` (tolérance en paramètre, 0 par défaut), `segmentIntersection`,
  `segmentDistance` / `segmentDistanceSquared`, `insidePolygon` (bord compris, version de `pick`),
  `simplifyPath` (tolérance 1e-6, version d'octilinear, qui couvre aussi les tracés orthogonaux d'avoid).
  Copies locales retirées de `stroke`, `polyline`, `controls/pointer`, `edgePoints`, `distribute`, `variants`,
  `route/util` (son `intersection` à coordonnées, port de mxUtils, délègue à `segmentIntersection`), `marquee`,
  `pick` (`insidePolygon` n'en est plus exporté : `picking`, `shapes/registry` et le test l'importent du module),
  `avoid`, `octilinear` (`segmentsCross(s, t)` y reste, sur ses `Segment`, avec la tolérance 1e-6), `jumps`,
  `align`, `effects/room`. Les `Math.hypot` de distance entre deux points passent par `distance`, sauf là où une
  variable locale s'appelle déjà `distance`. Laissés à part, car de sens différent : `inside` (strict, avec marge)
  et `contains` (rectangle dans rectangle) d'avoid, `contains` de `route/routers/state` (port de mxGraph, en
  coordonnées). Seul changement de comportement : la sélection par zone en mode contact prend une forme dont le
  contour passe exactement par un coin du rectangle. Test ajouté : `tests/engine/model/geometry.test.ts`.
  Vérifié dans l'appli : sélection par zone (`simple.drawio`), ancrage automatique (`anchor-auto-routing.drawio`) ;
  les sauts de flèches sont couverts par les tests seulement.
