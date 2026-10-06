import type { EdgeModel, PageModel, Point, Rect } from '../../../model/types';
import { rectContainsRect } from '../../../model/geometry';
import { toTerminal } from '../../../render/edges/edge';
import { fixedAnchor, routeEdge } from '../../../render/edges/route';
import { endAttachmentOf, sideOfConstraint } from '../../edgeEnds';
import { DEFAULT_AVOID_OPTIONS, out } from '../routing';
import type { AvoidOptions, Port, Router, Segment } from '../routing';
import { seededUnit } from '../seed';
import { ORTHOGONAL_ROUTER } from './orthogonal';

/**
 * Tracé automatique des flèches en ancrage automatique et Typon (SPEC §14.1) : si possible, le tracé contourne les
 * formes et ne se superpose pas aux autres flèches. draw.io ne sait pas éviter les obstacles : le tracé est calculé
 * ici (plus court chemin sur une grille tirée des formes et des flèches déjà tracées) et écrit en points
 * intermédiaires, que draw.io suit tels quels.
 */

/** Passes de reprise des tracés en conflit (croisement ou superposition), une fois toutes les flèches tracées. */
const REROUTE_PASSES = 3;

/** Côté et point d'attache d'un bout fixe de flèche, projeté sur le contour comme le tracé. */
function portOf(page: PageModel, edge: EdgeModel, end: 'source' | 'target'): Port | undefined {
  const attachment = endAttachmentOf(edge, end);
  if (attachment?.kind !== 'fixed') return undefined;
  const side = sideOfConstraint(attachment.constraint);
  const terminal = toTerminal(page.shapes.find((s) => s.id === attachment.shapeId));
  const point = terminal && fixedAnchor(terminal, edge.style, end);
  return side && point ? { point, side } : undefined;
}

/**
 * Tracés des flèches `edgeIds` (bouts fixes sur un côté) : chacune contourne les formes de la page (sauf celles qui
 * contiennent ses bouts, comme un conteneur) et évite les flèches déjà tracées, dans l'ordre des ids. Renvoie les
 * points intermédiaires de chaque flèche tracée.
 */
export function avoidRoutes(
  page: PageModel,
  edgeIds: ReadonlySet<string>,
  options: AvoidOptions = DEFAULT_AVOID_OPTIONS,
  seed = 0,
  router: Router = ORTHOGONAL_ROUTER,
): Map<string, Point[]> {
  const shapes = new Map(page.shapes.map((s) => [s.id, s]));
  const routeOf = (edge: EdgeModel) =>
    routeEdge({
      source: toTerminal(shapes.get(edge.sourceId ?? '')),
      target: toTerminal(shapes.get(edge.targetId ?? '')),
      sourcePoint: edge.sourcePoint,
      targetPoint: edge.targetPoint,
      waypoints: edge.points,
      style: edge.style,
    });
  const fixed: Segment[] = page.edges.filter((e) => !edgeIds.has(e.id)).flatMap((e) => router.segments(routeOf(e)));
  // Nombre de bouts par côté de forme : le bout le plus chargé attire les coudes de sa flèche.
  const load = new Map<string, number>();
  const sideKey = (edge: EdgeModel, end: 'source' | 'target') => {
    const attachment = endAttachmentOf(edge, end);
    return attachment?.kind === 'fixed' ? `${attachment.shapeId}\u0000${sideOfConstraint(attachment.constraint)}` : '';
  };
  for (const edge of page.edges)
    for (const end of ['source', 'target'] as const)
      load.set(sideKey(edge, end), (load.get(sideKey(edge, end)) ?? 0) + 1);

  interface Job {
    edge: EdgeModel;
    from: Port;
    to: Port;
    obstacles: Rect[];
    attract: Point;
    span: number;
  }
  const jobs: Job[] = [];
  for (const edge of page.edges) {
    if (!edgeIds.has(edge.id)) continue;
    const from = portOf(page, edge, 'source');
    const to = portOf(page, edge, 'target');
    const ends = [shapes.get(edge.sourceId ?? ''), shapes.get(edge.targetId ?? '')];
    if (!from || !to || !ends[0] || !ends[1]) continue;
    const obstacles = page.shapes
      .filter((s) => s.visible && s.bounds.width > 0 && s.bounds.height > 0)
      .filter((s) => !ends.some((end) => end !== s && rectContainsRect(s.bounds, end!.bounds)))
      .map((s) => s.bounds);
    const hub = (load.get(sideKey(edge, 'source')) ?? 0) > (load.get(sideKey(edge, 'target')) ?? 0) ? from : to;
    const span = Math.abs(from.point.x - to.point.x) + Math.abs(from.point.y - to.point.y);
    jobs.push({ edge, from, to, obstacles, attract: out(hub, options.stub), span });
  }
  // Les plus longues d'abord : elles prennent les couloirs proches du bout chargé, les plus courtes s'emboîtent.
  // Graine : l'ordre de tracé est un peu perturbé (les longueurs restent le critère principal).
  const weight = (job: Job) => job.span * (seed === 0 ? 1 : 1 + 0.5 * seededUnit(seed, job.edge.id));
  jobs.sort((a, b) => weight(b) - weight(a) || a.edge.id.localeCompare(b.edge.id));

  const pathIn = (routes: Map<string, Point[]>, job: Job) => {
    const points = routes.get(job.edge.id);
    return points ? router.segments([job.from.point, ...points, job.to.point]) : [];
  };
  /** Flèches en conflit (croisement ou superposition avec une autre) dans un jeu de tracés. */
  const conflicting = (routes: Map<string, Point[]>) => {
    const paths = jobs.map((job) => pathIn(routes, job));
    const found = new Set<Job>();
    jobs.forEach((job, i) =>
      jobs.forEach((other, k) => {
        if (k <= i) return;
        if (paths[i]!.some((s) => paths[k]!.some((t) => router.conflict(s, t)))) {
          found.add(job);
          found.add(other);
        }
      }),
    );
    return found;
  };
  /** Trace `order` l'une après l'autre, chacune évitant les tracés déjà posés (et ceux des autres flèches). */
  const routeAll = (routes: Map<string, Point[]>, order: Job[]) => {
    const next = new Map(routes);
    for (const job of order) next.delete(job.edge.id);
    for (const job of order) {
      const occupied = [...fixed, ...jobs.filter((other) => other !== job).flatMap((other) => pathIn(next, other))];
      const points = router.route(job.from, job.to, job.obstacles, occupied, job.attract, options, seed);
      if (points) next.set(job.edge.id, points);
    }
    return next;
  };

  // Les plus longues d'abord ; puis les flèches en conflit sont retirées ensemble et retracées, dans l'ordre puis
  // dans l'ordre inverse : on garde le jeu qui laisse le moins de conflits.
  let result = routeAll(new Map(), jobs);
  for (let pass = 0; pass < REROUTE_PASSES; pass++) {
    const conflicts = conflicting(result);
    if (conflicts.size === 0) break;
    const order = jobs.filter((job) => conflicts.has(job));
    let best = result;
    let bestCount = conflicts.size;
    for (const attempt of [order, [...order].reverse()]) {
      const routes = routeAll(result, attempt);
      const count = conflicting(routes).size;
      if (count < bestCount) [best, bestCount] = [routes, count];
    }
    if (best === result) break;
    result = best;
  }
  return result;
}

/** Vrai si un segment passe par l'intérieur d'un rectangle (approché par l'emprise du segment s'il est oblique). */
function segmentEnters(s: Segment, r: Rect): boolean {
  const [x0, x1] = [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)];
  const [y0, y1] = [Math.min(s.a.y, s.b.y), Math.max(s.a.y, s.b.y)];
  return x1 > r.x + 1e-6 && x0 < r.x + r.width - 1e-6 && y1 > r.y + 1e-6 && y0 < r.y + r.height - 1e-6;
}

/** Flèches dont le tracé actuel traverse une des formes `shapeIds` (autre que ses bouts et leurs conteneurs). */
export function edgesThrough(page: PageModel, shapeIds: ReadonlySet<string>): Set<string> {
  const shapes = new Map(page.shapes.map((s) => [s.id, s]));
  const result = new Set<string>();
  for (const edge of page.edges) {
    const ends = [shapes.get(edge.sourceId ?? ''), shapes.get(edge.targetId ?? '')];
    const crossed = [...shapeIds]
      .map((id) => shapes.get(id))
      .filter((s) => s && !ends.some((end) => end && rectContainsRect(s.bounds, end.bounds)));
    if (crossed.length === 0) continue;
    const route = routeEdge({
      source: toTerminal(ends[0]),
      target: toTerminal(ends[1]),
      sourcePoint: edge.sourcePoint,
      targetPoint: edge.targetPoint,
      waypoints: edge.points,
      style: edge.style,
    });
    for (let i = 0; i + 1 < route.length; i++) {
      const s = { a: route[i]!, b: route[i + 1]! };
      if (crossed.some((shape) => segmentEnters(s, shape!.bounds))) {
        result.add(edge.id);
        break;
      }
    }
  }
  return result;
}
