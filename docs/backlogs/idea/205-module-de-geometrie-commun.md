# Module de géométrie commun (Point, Rect)

> Idée — dette technique du moteur (mutualisation)

- Fonctions réécrites localement : `distance` (stroke, polyline, controls/pointer), `center` (route/util,
  edgePoints, distribute), `contains` / `inside` (avoid, marquee, edgePoints, route/state), `insidePolygon` (pick,
  marquee, arguments dans l'ordre inverse), `segmentsCross` / `intersection` (octilinear, marquee, route/util,
  jumps), `unionOf` (align, effects/room), `simplifyPath` (avoid en égalité stricte, octilinear avec tolérance et
  colinéarité générale : à garder distincts ou paramétrer). Une quarantaine de `Math.hypot` à la main.
- Les rassembler dans un module unique (ex. `model/geometry.ts`) et les réutiliser.
