import type { EdgeModel, PageModel, Point } from '../../../model/types';
import { toTerminal } from '../../../render/edges/terminal';
import { routeEdge } from '../../../render/edges/route';
import type { AvoidOptions, Router } from '../routing';
import { avoidRoutes, edgesThrough } from './avoid';
import { ORTHOGONAL_ROUTER } from './routeAround';
import { distributeAnchors } from './distribute';
import type { AnchorChange } from './distribute';
import { constraintStyle } from '../../edgeEnds';
import { edgeOf, shapesById } from '../../../model/pageIndex';
import { isBlockArrow } from '../../../render/edges/blockArrow';

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
  /** Façon de tracer (orthogonale, ou octilinéaire en Typon). */
  router: Router;
}

/**
 * Clés à changer sur une flèche répartie pour qu'elle ait le tracé de l'ancrage (`Router.edgeStyle`) ; vide pour une
 * flèche pleine (sans tracé) ou déjà au bon style.
 */
export function routerStyleChanges(edge: EdgeModel, router: Router): Record<string, string | undefined> {
  if (isBlockArrow(edge.style)) return {};
  return Object.fromEntries(Object.entries(router.edgeStyle).filter(([key, value]) => edge.style[key] !== value));
}

/** Style de la flèche une fois les clés de `routerStyleChanges` écrites. */
export function withStyleChanges(
  style: Record<string, string>,
  changes: Record<string, string | undefined>,
): Record<string, string> {
  const result = { ...style };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return result;
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
  options: {
    seed?: number;
    route?: AvoidOptions;
    router?: Router;
    resite?: ReadonlySet<string>;
    /** Bouts placés par le mode de la page (`endKey`, sujet 338) : laissés où il les a mis. */
    kept?: ReadonlySet<string>;
  } = {},
): Arrangement {
  const seed = options.seed ?? 0;
  const router = options.router ?? ORTHOGONAL_ROUTER;
  const constraints = distributeAnchors(page, shapeIds, seed, options.resite, options.kept);
  const work = withConstraints(page, constraints);
  const edgeIds = edgesThrough(work, shapeIds);
  for (const edge of work.edges)
    if ((edge.sourceId && shapeIds.has(edge.sourceId)) || (edge.targetId && shapeIds.has(edge.targetId)))
      edgeIds.add(edge.id);
  const routes = options.route ? avoidRoutes(work, edgeIds, options.route, seed, router) : new Map<string, Point[]>();
  return { constraints, edgeIds, routes, routed: !!options.route, router };
}

/** Vrai si l'agencement change quelque chose à la page (point d'attache ou tracé). */
export function arrangementChanges(page: PageModel, arrangement: Arrangement): boolean {
  if (arrangement.constraints.length > 0) return true;
  for (const [id, points] of arrangement.routes) {
    const edge = edgeOf(page, id);
    if (!edge || edge.points.length !== points.length) return true;
    if (edge.points.some((p, i) => p.x !== points[i]!.x || p.y !== points[i]!.y)) return true;
  }
  return false;
}

/** Nombre de paires de flèches qui se croisent ou se superposent, une fois l'agencement appliqué. */
export function arrangementConflicts(page: PageModel, arrangement: Arrangement): number {
  const work = withConstraints(page, arrangement.constraints);
  const shapes = shapesById(work);
  const { router, routes } = arrangement;
  const paths = work.edges.map((edge) =>
    router.segments(
      routeEdge({
        source: toTerminal(shapes.get(edge.sourceId ?? '')),
        target: toTerminal(shapes.get(edge.targetId ?? '')),
        sourcePoint: edge.sourcePoint,
        targetPoint: edge.targetPoint,
        waypoints: routes.get(edge.id) ?? edge.points,
        style: arrangement.edgeIds.has(edge.id)
          ? withStyleChanges(edge.style, routerStyleChanges(edge, router))
          : edge.style,
      }),
    ),
  );
  let count = 0;
  for (let i = 0; i < paths.length; i++)
    for (let k = i + 1; k < paths.length; k++)
      if (paths[i]!.some((s) => paths[k]!.some((t) => router.conflict(s, t)))) count++;
  return count;
}
