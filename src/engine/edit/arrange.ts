import type { EdgeModel, PageModel, Point } from '../model/types';
import { toTerminal } from '../render/edges/edge';
import { routeEdge } from '../render/edges/route';
import { avoidRoutes, crosses, edgesThrough, overlap, segmentsOf } from './avoid';
import type { AvoidOptions } from './avoid';
import { distributeAnchors } from './distribute';
import type { AnchorChange } from './distribute';
import { constraintStyle } from './edgeEnds';

/**
 * Agencement en ancrage automatique (SPEC §14.1) : répartition des flèches sur les côtés des formes `shapeIds`, puis
 * tracés qui contournent formes et flèches (si `route` est donné), pour une graine. Calcul pur : le moteur l'écrit.
 */
export interface Arrangement {
  /** Nouveaux points d'attache. */
  constraints: AnchorChange[];
  /** Flèches recalculées (celles des formes, et celles qui en traversent une). */
  edgeIds: Set<string>;
  /** Tracés trouvés (points intermédiaires), par flèche. */
  routes: Map<string, Point[]>;
  /** Vrai si le tracé automatique était demandé. */
  routed: boolean;
}

/** Copie de la page où les flèches ont leurs nouveaux points d'attache. */
function withConstraints(page: PageModel, changes: readonly AnchorChange[]): PageModel {
  if (changes.length === 0) return page;
  const edges = page.edges.map((edge): EdgeModel => {
    const mine = changes.filter((c) => c.edgeId === edge.id);
    if (mine.length === 0) return edge;
    const style = { ...edge.style };
    for (const { end, constraint } of mine)
      for (const [key, value] of Object.entries(constraintStyle(end, constraint))) {
        if (value === undefined) delete style[key];
        else style[key] = value;
      }
    return { ...edge, style };
  });
  return { ...page, edges };
}

export function arrangeAnchors(
  page: PageModel,
  shapeIds: ReadonlySet<string>,
  options: { seed?: number; route?: AvoidOptions } = {},
): Arrangement {
  const seed = options.seed ?? 0;
  const constraints = distributeAnchors(page, shapeIds, seed);
  const work = withConstraints(page, constraints);
  const edgeIds = edgesThrough(work, shapeIds);
  for (const edge of work.edges)
    if ((edge.sourceId && shapeIds.has(edge.sourceId)) || (edge.targetId && shapeIds.has(edge.targetId)))
      edgeIds.add(edge.id);
  const routes = options.route ? avoidRoutes(work, edgeIds, options.route, seed) : new Map<string, Point[]>();
  return { constraints, edgeIds, routes, routed: !!options.route };
}

/** Vrai si l'agencement change quelque chose à la page (point d'attache ou tracé). */
export function arrangementChanges(page: PageModel, arrangement: Arrangement): boolean {
  if (arrangement.constraints.length > 0) return true;
  for (const [id, points] of arrangement.routes) {
    const edge = page.edges.find((e) => e.id === id);
    if (!edge || edge.points.length !== points.length) return true;
    if (edge.points.some((p, i) => p.x !== points[i]!.x || p.y !== points[i]!.y)) return true;
  }
  return false;
}

/** Nombre de paires de flèches qui se croisent ou se superposent, une fois l'agencement appliqué. */
export function arrangementConflicts(page: PageModel, arrangement: Arrangement): number {
  const work = withConstraints(page, arrangement.constraints);
  const shapes = new Map(work.shapes.map((s) => [s.id, s]));
  const paths = work.edges.map((edge) =>
    segmentsOf(
      routeEdge({
        source: toTerminal(shapes.get(edge.sourceId ?? '')),
        target: toTerminal(shapes.get(edge.targetId ?? '')),
        sourcePoint: edge.sourcePoint,
        targetPoint: edge.targetPoint,
        waypoints: arrangement.routes.get(edge.id) ?? edge.points,
        style: edge.style,
      }),
    ),
  );
  let count = 0;
  for (let i = 0; i < paths.length; i++)
    for (let k = i + 1; k < paths.length; k++)
      if (paths[i]!.some((s) => paths[k]!.some((t) => crosses(s, t) || overlap(s, t) > 0.5))) count++;
  return count;
}
