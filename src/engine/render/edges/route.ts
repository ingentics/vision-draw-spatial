/**
 * Calcul du tracé d'une arête (SPEC §8.3), **porté de draw.io** (`mxEdgeStyle`,
 * `mxGraphView.updateEdgeState`, `mxPerimeter`, version embarquée par draw.io 24.7.5) pour qu'une flèche
 * s'affiche ici exactement comme dans draw.io, et qu'un point posé ici y reste au même endroit.
 * Vérifié contre l'export SVG de draw.io (fixtures `edge-routing.drawio`, `edge-ends.drawio`).
 *
 * Code d'origine : mxGraph, Copyright (c) 2006-2015, JGraph Ltd, sous licence Apache 2.0
 * (https://www.apache.org/licenses/LICENSE-2.0) ; traduit en TypeScript et adapté au modèle du moteur.
 *
 * draw.io n'enregistre que les choix de l'utilisateur (points d'attache, points intermédiaires,
 * extrémités libres) ; le tracé est recalculé, en trois temps :
 * 1. bouts **fixes** : point d'attache imposé (`exitX`…, projeté sur le contour) ou extrémité libre ;
 * 2. **routeur** du style (`edgeStyle`) : points intermédiaires du tracé ;
 * 3. bouts **flottants** : contour de la forme, visé depuis le point voisin (la cible d'abord).
 *
 * Non repris : rotation des formes, ports (`sourcePort`), bornes de stencils à proportions fixes,
 * géométries relatives (ports) dans `entityRelationEdgeStyle`.
 */

export { perimeterKind, perimeterToward } from './route/perimeters';
export { perimeterPolygon } from './route/perimeters/polygons';
export { routeEdge, routeEdgePoints } from './route/routeEdge';
export { routingKind } from './route/routingKind';
export { simplify } from './route/simplify';
export { constraintFromStyle, fixedAnchor, routingCenter } from './route/terminals';
export type { Constraint, PerimeterKind, RouteInput, RoutingKind, Terminal } from './route/types';
