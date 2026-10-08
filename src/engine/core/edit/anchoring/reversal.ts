import type { PageModel, Point } from '../../model/types';
import { edgeOf, shapesById } from '../../model/pageIndex';
import { toTerminal } from '../../render/edges/terminal';
import { routeEdge } from '../../render/edges/route';
import { constraintStyle, frameConstraint } from '../edgeEnds';
import type { TerminalEnd } from '../edgeEnds';

/** Écart toléré entre deux points de tracé (bruit de calcul seulement), et celui d'un coude ramené au pixel. */
const EPSILON = 1e-6;
const CORNER_EPSILON = 1;

const sameRoute = (a: Point[], b: Point[], epsilon = EPSILON) =>
  a.length === b.length && a.every((p, i) => Math.abs(p.x - b[i]!.x) < epsilon && Math.abs(p.y - b[i]!.y) < epsilon);

const isPinned = (style: Record<string, string>, prefix: 'exit' | 'entry') =>
  style[`${prefix}X`] !== undefined && style[`${prefix}Y`] !== undefined;

/** Ce qu'il faut écrire sur une flèche inversée pour qu'elle garde son tracé. */
export interface ReversalFix {
  /** Points d'attache des bouts flottants rattachés à une forme (`constraintStyle`). */
  pins: Partial<Record<TerminalEnd, Point>>;
  /** Points intermédiaires à écrire (coordonnées de page), quand les points d'attache ne suffisent pas ; absent : inchangés. */
  points?: Point[];
}

/**
 * Ce qu'il faut écrire pour qu'une flèche inversée garde son tracé (sujet 328). `reversedStyle` est son style après
 * inversion (`reverseEdgeCell`). Le routeur d'une flèche à angles droits dépend du sens (le chemin de A vers B n'est pas
 * celui de B vers A) : si le tracé inversé diffère de l'ancien, on fixe chaque bout flottant rattaché à une forme là où
 * l'ancien tracé la touche ; si cela ne suffit pas (bouts libres), on écrit les coudes de l'ancien tracé comme points
 * intermédiaires. `undefined` : le tracé est déjà le même, ou aucune des corrections ne le retrouve.
 */
export function reversalFix(
  page: PageModel,
  edgeId: string,
  reversedStyle: Record<string, string>,
): ReversalFix | undefined {
  const edge = edgeOf(page, edgeId);
  const shapes = shapesById(page);
  if (!edge) return undefined;
  const source = shapes.get(edge.sourceId ?? '');
  const target = shapes.get(edge.targetId ?? '');
  const before = routeEdge({
    source: toTerminal(source),
    target: toTerminal(target),
    sourcePoint: edge.sourcePoint,
    targetPoint: edge.targetPoint,
    waypoints: edge.points,
    style: edge.style,
  });
  if (before.length < 2) return undefined;
  const expected = [...before].reverse();
  const routeWith = (style: Record<string, string>, waypoints: Point[]) =>
    routeEdge({
      source: toTerminal(target),
      target: toTerminal(source),
      sourcePoint: edge.targetPoint,
      targetPoint: edge.sourcePoint,
      waypoints,
      style,
    });
  const reversedPoints = [...edge.points].reverse();
  if (sameRoute(expected, routeWith(reversedStyle, reversedPoints))) return undefined;

  const pins: Partial<Record<TerminalEnd, Point>> = {};
  // Après inversion, la source est l'ancienne cible : son bout est là où l'ancien tracé finissait.
  if (target && !isPinned(reversedStyle, 'exit')) pins.source = frameConstraint(target.bounds, expected[0]!);
  if (source && !isPinned(reversedStyle, 'entry'))
    pins.target = frameConstraint(source.bounds, expected[expected.length - 1]!);
  const pinnedStyle = { ...reversedStyle };
  for (const [end, constraint] of Object.entries(pins) as Array<[TerminalEnd, Point]>)
    for (const [key, value] of Object.entries(constraintStyle(end, constraint)))
      if (value !== undefined) pinnedStyle[key] = value;
  if (Object.keys(pins).length > 0 && sameRoute(expected, routeWith(pinnedStyle, reversedPoints))) return { pins };

  // Coudes de l'ancien tracé : tels quels, puis ramenés au pixel (le routeur à bouts libres décale ses coudes de 0,5).
  const corners = expected.slice(1, -1);
  for (const points of [corners, corners.map((p) => ({ x: Math.floor(p.x), y: Math.floor(p.y) }))])
    if (sameRoute(expected, routeWith(pinnedStyle, points), CORNER_EPSILON)) return { pins, points };
  return undefined;
}
