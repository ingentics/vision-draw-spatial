# Primitives de tracé communes aux ancrages automatique et Typon

> Itération — moteur (ancrage des flèches) ; dette technique

- `pcb/octilinear.ts` importe ses briques depuis `auto/avoid.ts` (file de priorité, ports, segments, normales,
  coûts, `inflate`, `inside`, `Router`) et `auto/seed.ts` : le Typon dépend de l'automatique au lieu d'un socle
  commun. `avoid.ts` (478 lignes) mêle ces briques, le routeur orthogonal et l'orchestration des tracés.
- Briques partagées dans `edit/anchoring/routing.ts`, graine dans `edit/anchoring/seed.ts` ; routeur orthogonal
  dans `auto/orthogonal.ts` ; `avoid.ts` garde l'orchestration (`avoidRoutes`, `edgesThrough`).
- Normales des côtés une seule fois (`SIDE_NORMALS` dans `edgeEnds.ts`, reprises par `squareEnd.ts`) ; inclusion
  d'un rectangle dans un autre dans `model/geometry.ts`.
- Aucun changement de comportement.
- **Fini quand :** `pcb/` n'importe plus rien de `auto/` ; tracés automatiques et Typon identiques dans l'appli ;
  `make check` vert.
- Fait : `edit/anchoring/routing.ts` (réglages, coûts, `Port`, `Segment`, `out`, `inflate`, `inside`, `Heap`,
  `Router`) et `edit/anchoring/seed.ts` (déplacé de `auto/`) ; `auto/orthogonal.ts` reçoit `routeAround`,
  `segmentsOf`, `overlap`, `crosses` et `ORTHOGONAL_ROUTER` ; `auto/avoid.ts` ne garde que `avoidRoutes` et
  `edgesThrough`. `SIDE_NORMALS` dans `edgeEnds.ts` (repris par `squareEnd.ts`, `orthogonal.ts`, `octilinear.ts`),
  `rectContainsRect` dans `model/geometry.ts`. `pcb/` n'importe plus rien de `auto/`. Tests inchangés hors imports ;
  `make check` vert, page « Ancrage automatique » tracée comme avant dans l'appli.
