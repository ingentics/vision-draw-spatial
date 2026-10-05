import type { EdgeModel, PageModel, Point, Rect } from '../model/types';
import { toTerminal } from '../render/edges/edge';
import { fixedAnchor, routeEdge } from '../render/edges/route';
import { endAttachmentOf, sideOfConstraint } from './edgeEnds';
import type { AnchorSide } from './edgeEnds';

/**
 * Tracé automatique des flèches en ancrage automatique (SPEC §14.1) : si possible, le tracé orthogonal contourne les
 * formes et ne se superpose pas aux autres flèches. draw.io ne sait pas éviter les obstacles : le tracé est calculé
 * ici (plus court chemin sur une grille tirée des formes et des flèches déjà tracées) et écrit en points
 * intermédiaires, que draw.io suit tels quels.
 */

/** Écart minimal entre un tracé et une forme, en pixels de page. */
export const SHAPE_CLEARANCE = 10;
/** Longueur du premier et du dernier segment, perpendiculaires au côté. */
export const PORT_STUB = 20;
/** Écart entre deux flèches qui partagent un couloir. */
export const EDGE_SPACING = 10;

/** Coût d'un coude, en pixels de longueur équivalente. */
const BEND_COST = 30;
/** Coût par pixel de tracé superposé à une autre flèche. */
const OVERLAP_COST = 40;
/** Coût d'un croisement avec une autre flèche : plus qu'un détour de quelques coudes. */
const CROSSING_COST = 500;
/** Attirance (par pixel de tracé et de distance) vers le bout où converge un faisceau : départage les égalités. */
const ATTRACT_COST = 1e-4;
/** Passes de reprise des tracés en conflit (croisement ou superposition), une fois toutes les flèches tracées. */
const REROUTE_PASSES = 3;
/** Marge de la zone de recherche autour des deux bouts. */
const WINDOW = 300;

export interface Port {
  point: Point;
  side: AnchorSide;
}

/** Segment horizontal ou vertical. */
export interface Segment {
  a: Point;
  b: Point;
}

const NORMALS: Record<AnchorSide, Point> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};
/** Directions de déplacement sur la grille : droite, bas, gauche, haut. */
const DIRS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const dirIndex = (d: Point) => DIRS.findIndex((v) => v.x === d.x && v.y === d.y);

const out = ({ point, side }: Port, length: number): Point => ({
  x: point.x + NORMALS[side].x * length,
  y: point.y + NORMALS[side].y * length,
});

function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by };
}

/** Point strictement à l'intérieur (bord exclu). */
function inside(r: Rect, p: Point): boolean {
  return p.x > r.x + 1e-6 && p.x < r.x + r.width - 1e-6 && p.y > r.y + 1e-6 && p.y < r.y + r.height - 1e-6;
}

/** Longueur commune de deux segments colinéaires (0 s'ils ne le sont pas). */
function overlap(s: Segment, t: Segment): number {
  const vertical = s.a.x === s.b.x;
  if (vertical !== (t.a.x === t.b.x)) return 0;
  if (vertical ? Math.abs(s.a.x - t.a.x) > 0.5 : Math.abs(s.a.y - t.a.y) > 0.5) return 0;
  const [s0, s1] = vertical ? [s.a.y, s.b.y] : [s.a.x, s.b.x];
  const [t0, t1] = vertical ? [t.a.y, t.b.y] : [t.a.x, t.b.x];
  return Math.max(0, Math.min(Math.max(s0, s1), Math.max(t0, t1)) - Math.max(Math.min(s0, s1), Math.min(t0, t1)));
}

/** Vrai si deux segments perpendiculaires se croisent. */
function crosses(s: Segment, t: Segment): boolean {
  const sv = s.a.x === s.b.x;
  if (sv === (t.a.x === t.b.x)) return false;
  const [v, h] = sv ? [s, t] : [t, s];
  const x = v.a.x;
  const y = h.a.y;
  const between = (c: number, a: number, b: number) => c > Math.min(a, b) && c < Math.max(a, b);
  return between(x, h.a.x, h.b.x) && between(y, v.a.y, v.b.y);
}

/**
 * Vrai si un pas de grille `m` (parcouru de a vers b) franchit le segment perpendiculaire `o` : la ligne de `o` est
 * atteinte après le départ du pas (fin comprise), à l'intérieur de `o`. Compté une seule fois quand le croisement
 * tombe sur un nœud de la grille.
 */
function stepCrosses(m: Segment, o: Segment): boolean {
  const mv = m.a.x === m.b.x;
  if (mv === (o.a.x === o.b.x)) return false;
  const along = mv ? [m.a.y, m.b.y, o.a.y] : [m.a.x, m.b.x, o.a.x];
  const across = mv ? m.a.x : m.a.y;
  const [o0, o1] = mv ? [o.a.x, o.b.x] : [o.a.y, o.b.y];
  const t = (along[2]! - along[0]!) / (along[1]! - along[0]!);
  return t > 0 && t <= 1 && across > Math.min(o0!, o1!) && across < Math.max(o0!, o1!);
}

/** Segments d'une ligne brisée orthogonale (les segments obliques sont ignorés). */
export function segmentsOf(path: Point[]): Segment[] {
  const result: Segment[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i]!, path[i + 1]!];
    if ((a.x === b.x) !== (a.y === b.y)) result.push({ a, b });
  }
  return result;
}

/** Retire les points alignés ou confondus. */
function simplifyPath(path: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of path) {
    const last = result[result.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    const before = result[result.length - 2];
    if (before && last && ((before.x === last.x && last.x === p.x) || (before.y === last.y && last.y === p.y)))
      result[result.length - 1] = p;
    else result.push(p);
  }
  return result;
}

/** File de priorité minimale (tas binaire). */
class Heap {
  private items: Array<{ cost: number; state: number }> = [];
  get size(): number {
    return this.items.length;
  }
  push(cost: number, state: number): void {
    const items = this.items;
    items.push({ cost, state });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent]!.cost <= items[i]!.cost) break;
      [items[parent], items[i]] = [items[i]!, items[parent]!];
      i = parent;
    }
  }
  pop(): { cost: number; state: number } {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let min = i;
        if (l < items.length && items[l]!.cost < items[min]!.cost) min = l;
        if (r < items.length && items[r]!.cost < items[min]!.cost) min = r;
        if (min === i) break;
        [items[min], items[i]] = [items[i]!, items[min]!];
        i = min;
      }
    }
    return top;
  }
}

/**
 * Tracé orthogonal de `from` à `to` qui contourne `obstacles` (écartés de `SHAPE_CLEARANCE`) et évite de longer
 * `occupied` : premier et dernier segments perpendiculaires aux côtés, puis plus court chemin (coudes, superpositions
 * et croisements pénalisés). Renvoie les points intermédiaires (bouts exclus), ou undefined sans chemin.
 */
export function routeAround(
  from: Port,
  to: Port,
  obstacles: readonly Rect[],
  occupied: readonly Segment[],
  attract?: Point,
): Point[] | undefined {
  const start = out(from, PORT_STUB);
  const goal = out(to, PORT_STUB);
  const blocks = obstacles.map((r) => inflate(r, SHAPE_CLEARANCE));
  if (blocks.some((b) => inside(b, start) || inside(b, goal))) return undefined;

  const box = {
    x0: Math.min(start.x, goal.x) - WINDOW,
    y0: Math.min(start.y, goal.y) - WINDOW,
    x1: Math.max(start.x, goal.x) + WINDOW,
    y1: Math.max(start.y, goal.y) + WINDOW,
  };
  const near = blocks.filter((b) => b.x < box.x1 && b.x + b.width > box.x0 && b.y < box.y1 && b.y + b.height > box.y0);
  const near2 = occupied.filter(
    (s) =>
      Math.max(s.a.x, s.b.x) >= box.x0 &&
      Math.min(s.a.x, s.b.x) <= box.x1 &&
      Math.max(s.a.y, s.b.y) >= box.y0 &&
      Math.min(s.a.y, s.b.y) <= box.y1,
  );
  const xs = new Set([start.x, goal.x, box.x0, box.x1]);
  const ys = new Set([start.y, goal.y, box.y0, box.y1]);
  for (const b of near) {
    xs.add(b.x).add(b.x + b.width);
    ys.add(b.y).add(b.y + b.height);
  }
  // Voies parallèles aux flèches déjà tracées, pour pouvoir passer à côté.
  for (const s of near2) {
    if (s.a.x === s.b.x) xs.add(s.a.x - EDGE_SPACING).add(s.a.x + EDGE_SPACING);
    else ys.add(s.a.y - EDGE_SPACING).add(s.a.y + EDGE_SPACING);
  }
  const X = [...xs].filter((x) => x >= box.x0 && x <= box.x1).sort((a, b) => a - b);
  const Y = [...ys].filter((y) => y >= box.y0 && y <= box.y1).sort((a, b) => a - b);
  const W = X.length;
  const H = Y.length;
  const node = (i: number, j: number) => j * W + i;
  const blocked = (p: Point) => near.some((b) => inside(b, p));

  // État : nœud × direction d'arrivée.
  const states = W * H * 4;
  const cost = new Float64Array(states).fill(Infinity);
  const previous = new Int32Array(states).fill(-1);
  const heap = new Heap();
  const si = X.indexOf(start.x);
  const sj = Y.indexOf(start.y);
  const gi = X.indexOf(goal.x);
  const gj = Y.indexOf(goal.y);
  const first = dirIndex(NORMALS[from.side]);
  const inward = dirIndex({ x: -NORMALS[to.side].x, y: -NORMALS[to.side].y });
  const s0 = node(si, sj) * 4 + first;
  cost[s0] = 0;
  heap.push(0, s0);
  let best = -1;
  let bestCost = Infinity;
  while (heap.size > 0) {
    const { cost: c, state } = heap.pop();
    if (c > cost[state]!) continue;
    const n = state >> 2;
    const d = state & 3;
    const i = n % W;
    const j = (n - i) / W;
    if (i === gi && j === gj) {
      // Dernier segment vers la forme : coude si on n'y arrive pas déjà dans ce sens.
      const total = c + (d === inward ? 0 : BEND_COST);
      if (total < bestCost) [best, bestCost] = [state, total];
      continue;
    }
    for (let nd = 0; nd < 4; nd++) {
      if ((nd + 2) % 4 === d) continue;
      const ni = i + DIRS[nd]!.x;
      const nj = j + DIRS[nd]!.y;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const a = { x: X[i]!, y: Y[j]! };
      const b = { x: X[ni]!, y: Y[nj]! };
      if (blocked({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) || blocked(b)) continue;
      const segment = { a, b };
      const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      let step = length + (nd === d ? 0 : BEND_COST);
      // À coût égal, tourner près du bout `attract` (là où le faisceau converge) : les faisceaux s'emboîtent.
      if (attract)
        step += ATTRACT_COST * length * (Math.abs((a.x + b.x) / 2 - attract.x) + Math.abs((a.y + b.y) / 2 - attract.y));
      for (const s of near2) {
        step += overlap(segment, s) * OVERLAP_COST;
        if (stepCrosses(segment, s)) step += CROSSING_COST;
      }
      const next = node(ni, nj) * 4 + nd;
      if (c + step < cost[next]!) {
        cost[next] = c + step;
        previous[next] = state;
        heap.push(c + step, next);
      }
    }
  }
  if (best < 0) return undefined;
  const path: Point[] = [];
  for (let state = best; state >= 0; state = previous[state]!) {
    const n = state >> 2;
    path.unshift({ x: X[n % W]!, y: Y[Math.floor(n / W)]! });
  }
  return simplifyPath([from.point, ...path, to.point]).slice(1, -1);
}

/** Côté et point d'attache d'un bout fixe de flèche, projeté sur le contour comme le tracé. */
function portOf(page: PageModel, edge: EdgeModel, end: 'source' | 'target'): Port | undefined {
  const attachment = endAttachmentOf(edge, end);
  if (attachment?.kind !== 'fixed') return undefined;
  const side = sideOfConstraint(attachment.constraint);
  const terminal = toTerminal(page.shapes.find((s) => s.id === attachment.shapeId));
  const point = terminal && fixedAnchor(terminal, edge.style, end);
  return side && point ? { point, side } : undefined;
}

function contains(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

/**
 * Tracés des flèches `edgeIds` (bouts fixes sur un côté) : chacune contourne les formes de la page (sauf celles qui
 * contiennent ses bouts, comme un conteneur) et évite les flèches déjà tracées, dans l'ordre des ids. Renvoie les
 * points intermédiaires de chaque flèche tracée.
 */
export function avoidRoutes(page: PageModel, edgeIds: ReadonlySet<string>): Map<string, Point[]> {
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
  const fixed: Segment[] = page.edges.filter((e) => !edgeIds.has(e.id)).flatMap((e) => segmentsOf(routeOf(e)));
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
      .filter((s) => !ends.some((end) => end !== s && contains(s.bounds, end!.bounds)))
      .map((s) => s.bounds);
    const hub = (load.get(sideKey(edge, 'source')) ?? 0) > (load.get(sideKey(edge, 'target')) ?? 0) ? from : to;
    const span = Math.abs(from.point.x - to.point.x) + Math.abs(from.point.y - to.point.y);
    jobs.push({ edge, from, to, obstacles, attract: out(hub, PORT_STUB), span });
  }
  // Les plus longues d'abord : elles prennent les couloirs proches du bout chargé, les plus courtes s'emboîtent.
  jobs.sort((a, b) => b.span - a.span || a.edge.id.localeCompare(b.edge.id));

  const pathIn = (routes: Map<string, Point[]>, job: Job) => {
    const points = routes.get(job.edge.id);
    return points ? segmentsOf([job.from.point, ...points, job.to.point]) : [];
  };
  /** Flèches en conflit (croisement ou superposition avec une autre) dans un jeu de tracés. */
  const conflicting = (routes: Map<string, Point[]>) => {
    const paths = jobs.map((job) => pathIn(routes, job));
    const found = new Set<Job>();
    jobs.forEach((job, i) =>
      jobs.forEach((other, k) => {
        if (k <= i) return;
        if (paths[i]!.some((s) => paths[k]!.some((t) => crosses(s, t) || overlap(s, t) > 0.5))) {
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
      const points = routeAround(job.from, job.to, job.obstacles, occupied, job.attract);
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
      .filter((s) => s && !ends.some((end) => end && contains(s.bounds, end.bounds)));
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
