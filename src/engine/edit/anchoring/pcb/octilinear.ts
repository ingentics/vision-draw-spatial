import type { Point, Rect } from '../../../model/types';
import { ATTRACT_COST, BEND_COST, Heap, NORMALS, OVERLAP_COST, SEED_JITTER, inflate, inside, out } from '../auto/avoid';
import type { AvoidOptions, Port, Router, Segment } from '../auto/avoid';
import { seededUnit } from '../auto/seed';
import { cross, distance, segmentsCross as crossing, simplifyPath } from '../../../model/geometry';

/**
 * Tracé octilinéaire de l'ancrage « Typon » (SPEC §14.1), inspiré des pistes de circuit imprimé : segments à 0°, 45°
 * et 90°, plus court chemin sur une grille régulière (pas = écart entre flèches) en huit directions, premier et
 * dernier segments perpendiculaires aux côtés. Les coudes à 45° coûtent peu, à 90° davantage ; plus de 90° est
 * interdit. Les flèches déjà tracées sont reportées sur la grille : les longer ou les croiser est pénalisé.
 */

/** Huit directions, de 45° en 45° (sens horaire à l'écran) : droite, bas-droite, bas… */
const DIRS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];
/** Marge de la zone de recherche autour des deux bouts. */
const WINDOW = 200;
/** Pas de grille minimal. */
const MIN_STEP = 5;

const dirOf = (d: Point): number => DIRS.findIndex((v) => v.x === Math.sign(d.x) && v.y === Math.sign(d.y));
/** Écart entre deux directions, en huitièmes de tour (0 à 4). */
const turnOf = (a: number, b: number): number => Math.min((a - b + 8) % 8, (b - a + 8) % 8);
/** Coût des coudes, en pixels de longueur équivalente (`shapes.edgePcbBend45`, `shapes.edgePcbBend90`). */
export interface BendCosts {
  diagonal: number;
  right: number;
}

export const DEFAULT_BEND_COSTS: BendCosts = { diagonal: BEND_COST / 2, right: BEND_COST };
/** Axe d'une direction : 0 horizontal, 1 diagonal descendant, 2 vertical, 3 diagonal montant. */
const axisOf = (d: number): number => d % 4;

/** Segments d'une ligne brisée, obliques compris (les segments nuls sont ignorés). */
export function pathSegments(path: readonly Point[]): Segment[] {
  const result: Segment[] = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i]!, path[i + 1]!];
    if (Math.abs(a.x - b.x) > 1e-6 || Math.abs(a.y - b.y) > 1e-6) result.push({ a, b });
  }
  return result;
}

/** Vrai si deux segments quelconques se croisent franchement (bouts exclus, segments parallèles exclus). */
export function segmentsCross(s: Segment, t: Segment): boolean {
  return crossing(s.a, s.b, t.a, t.b, 1e-6);
}

/** Vrai si deux segments non parallèles se touchent, bouts compris (un coude posé sur une flèche la croise). */
function segmentsTouch(s: Segment, t: Segment): boolean {
  const eps = 1e-6;
  if (Math.abs((s.b.x - s.a.x) * (t.b.y - t.a.y) - (s.b.y - s.a.y) * (t.b.x - t.a.x)) < eps) return false;
  const d1 = cross(t.a, t.b, s.a);
  const d2 = cross(t.a, t.b, s.b);
  const d3 = cross(s.a, s.b, t.a);
  const d4 = cross(s.a, s.b, t.b);
  return d1 * d2 <= eps && d3 * d4 <= eps;
}

/** Longueur commune de deux segments quelconques (0 s'ils ne sont pas sur une même droite). */
export function segmentsOverlap(s: Segment, t: Segment): number {
  const length = distance(s.a, s.b);
  if (length < 1e-6) return 0;
  // Distance des bouts de t à la droite de s (0,5 px de tolérance, comme le tracé orthogonal).
  if (Math.abs(cross(s.a, s.b, t.a)) / length > 0.5 || Math.abs(cross(s.a, s.b, t.b)) / length > 0.5) return 0;
  const ux = (s.b.x - s.a.x) / length;
  const uy = (s.b.y - s.a.y) / length;
  const along = (p: Point) => (p.x - s.a.x) * ux + (p.y - s.a.y) * uy;
  const [t0, t1] = [along(t.a), along(t.b)];
  return Math.max(0, Math.min(length, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)));
}

/**
 * Tracé octilinéaire de `from` à `to`. Avec `avoid`, il contourne `obstacles` (écartés de `options.clearance`) et
 * évite de longer ou de croiser `occupied` ; sans, c'est le tracé octilinéaire le plus court, sans évitement.
 * Renvoie les points intermédiaires (bouts exclus), ou undefined sans chemin.
 */
export function routeOctilinear(
  from: Port,
  to: Port,
  obstacles: readonly Rect[],
  occupied: readonly Segment[],
  attract: Point | undefined,
  options: AvoidOptions,
  seed = 0,
  avoid = true,
  bends: BendCosts = DEFAULT_BEND_COSTS,
): Point[] | undefined {
  /** Coût d'un changement de direction ; Infinity au-delà de 90° (angle aigu). */
  const turnCost = (a: number, b: number): number =>
    [0, bends.diagonal, bends.right, Infinity, Infinity][turnOf(a, b)]!;
  const g = Math.max(MIN_STEP, options.spacing);
  const stub = Math.max(options.stub, options.clearance + 1);
  const start = out(from, stub);
  const goalStub = out(to, stub);
  const blocks = avoid ? obstacles.map((r) => inflate(r, options.clearance)) : [];
  if (blocks.some((b) => inside(b, start) || inside(b, goalStub))) return undefined;

  // Grille alignée sur le point de départ ; on rejoint la ligne d'arrivée (perpendiculaire au côté) en fin de tracé.
  const ext = (a: number, b: number, o: number) => {
    const lo = o - Math.ceil((o - Math.min(a, b) + WINDOW) / g) * g;
    const hi = o + Math.ceil((Math.max(a, b) - o + WINDOW) / g) * g;
    return [lo, Math.round((hi - lo) / g) + 1] as const;
  };
  const [x0, W] = ext(start.x, goalStub.x, start.x);
  const [y0, H] = ext(start.y, goalStub.y, start.y);
  const box = { x: x0, y: y0, width: (W - 1) * g, height: (H - 1) * g };
  const near = blocks.filter(
    (b) => b.x < box.x + box.width && b.x + b.width > box.x && b.y < box.y + box.height && b.y + b.height > box.y,
  );
  const blockedAt = (p: Point) => near.some((b) => inside(b, p));
  const nodeAt = (i: number, j: number) => j * W + i;
  const pointOf = (n: number): Point => ({ x: x0 + (n % W) * g, y: y0 + Math.floor(n / W) * g });
  const blocked = new Uint8Array(W * H);
  if (near.length > 0) for (let n = 0; n < W * H; n++) blocked[n] = blockedAt(pointOf(n)) ? 1 : 0;

  // Flèches déjà tracées reportées sur la grille : par nœud, les axes qui y passent (bits 0 à 3).
  const lines = avoid
    ? occupied.filter(
        (l) =>
          Math.max(l.a.x, l.b.x) >= box.x &&
          Math.min(l.a.x, l.b.x) <= box.x + box.width &&
          Math.max(l.a.y, l.b.y) >= box.y &&
          Math.min(l.a.y, l.b.y) <= box.y + box.height,
      )
    : [];
  const mask = new Uint8Array(W * H);
  for (const s of lines) {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const angle = Math.round((Math.atan2(dy, dx) / Math.PI) * 4);
    const axis = (((angle % 4) + 4) % 4) as number;
    const steps = Math.ceil(Math.hypot(dx, dy) / (g / 4));
    for (let k = 0; k <= steps; k++) {
      const i = Math.round((s.a.x + (dx * k) / Math.max(1, steps) - x0) / g);
      const j = Math.round((s.a.y + (dy * k) / Math.max(1, steps) - y0) / g);
      if (i >= 0 && j >= 0 && i < W && j < H) mask[nodeAt(i, j)]! |= 1 << axis;
    }
  }

  /** Coût de fréquentation d'un segment (hors longueur et coudes) : flèches longées ou croisées, graine, attirance. */
  const lineCost = (a: Point, b: Point, d: number, length: number, n?: number) => {
    let cost = 0;
    if (seed !== 0) {
      const key = ['y' + a.y, 'd' + (a.y - a.x), 'x' + a.x, 'e' + (a.y + a.x)][axisOf(d)]!;
      cost += SEED_JITTER * length * seededUnit(seed, key);
    }
    if (attract)
      cost += ATTRACT_COST * length * (Math.abs((a.x + b.x) / 2 - attract.x) + Math.abs((a.y + b.y) / 2 - attract.y));
    if (n !== undefined) {
      const m = mask[n]!;
      if (m & (1 << axisOf(d))) cost += OVERLAP_COST * length;
      if (m & ~(1 << axisOf(d))) cost += options.crossingDetour;
    } else {
      const segment = { a, b };
      for (const s of lines) {
        cost += segmentsOverlap(segment, s) * OVERLAP_COST;
        if (segmentsTouch(segment, s)) cost += options.crossingDetour;
      }
    }
    return cost;
  };
  const segmentBlocked = (a: Point, b: Point) => {
    if (near.length === 0) return false;
    const steps = Math.ceil(distance(a, b) / (g / 2));
    for (let k = 1; k < steps; k++)
      if (blockedAt({ x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps })) return true;
    return false;
  };

  // Arrivée : repère du côté visé (n = vers l'extérieur, u = le long du côté).
  const normal = NORMALS[to.side];
  const lateral = { x: -normal.y, y: normal.x };
  /**
   * Meilleure fin de tracé depuis le nœud `a` (direction d'arrivée `d`), si elle coûte moins que `limit` : coût et
   * points ajoutés, P compris.
   */
  const finish = (a: Point, d: number, limit: number): { cost: number; points: Point[] } | undefined => {
    const rel = { x: a.x - to.point.x, y: a.y - to.point.y };
    const along = rel.x * normal.x + rel.y * normal.y;
    const across = rel.x * lateral.x + rel.y * lateral.y;
    const c = Math.abs(across);
    let best: { cost: number; points: Point[] } | undefined;
    const consider = (q: Point, legs: number) => {
      const into = to.point;
      let cost = 0;
      let dir = d;
      let previous = a;
      // Jusqu'au bout du dernier segment (à `stub` de la forme), puis vers la forme.
      const points = (legs === 0 ? [goalStub, into] : [q, goalStub, into]).filter(
        (p, k, all) => k === 0 || Math.hypot(p.x - all[k - 1]!.x, p.y - all[k - 1]!.y) > 1e-6,
      );
      const legsOf: Array<{ a: Point; b: Point; d: number; length: number }> = [];
      for (const p of points) {
        const nd = dirOf({ x: p.x - previous.x, y: p.y - previous.y });
        if (nd < 0) return;
        const length = distance(previous, p);
        cost += length + turnCost(dir, nd);
        legsOf.push({ a: previous, b: p, d: nd, length });
        [dir, previous] = [nd, p];
      }
      // Contrôles coûteux seulement si la fin peut encore faire mieux. Le dernier segment (dans la zone d'écart de la
      // forme visée) n'est pas contrôlé.
      if (cost >= Math.min(limit, best?.cost ?? Infinity)) return;
      for (const leg of legsOf.slice(0, -1)) {
        if (segmentBlocked(leg.a, leg.b)) return;
        cost += lineCost(leg.a, leg.b, leg.d, leg.length);
      }
      if (!best || cost < best.cost) best = { cost, points };
    };
    if (c < 1e-6) {
      if (along >= stub - 1e-6) consider(a, 0);
      return best;
    }
    // Droit jusqu'à la ligne d'arrivée, puis vers la forme.
    if (along >= stub - 1e-6) consider({ x: to.point.x + normal.x * along, y: to.point.y + normal.y * along }, 1);
    // En diagonale jusqu'à la ligne d'arrivée, puis vers la forme.
    if (along - c >= stub - 1e-6)
      consider({ x: to.point.x + normal.x * (along - c), y: to.point.y + normal.y * (along - c) }, 1);
    return best;
  };

  /** Minorant du coût restant (A*) : longueur octilinéaire jusqu'à la forme visée. */
  const remaining = (n: number) => {
    const p = pointOf(n);
    const [dx, dy] = [Math.abs(p.x - to.point.x), Math.abs(p.y - to.point.y)];
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  // État : nœud × direction d'arrivée.
  const states = W * H * 8;
  const cost = new Float64Array(states).fill(Infinity);
  const previous = new Int32Array(states).fill(-1);
  const heap = new Heap();
  const s0 = nodeAt(Math.round((start.x - x0) / g), Math.round((start.y - y0) / g)) * 8 + dirOf(NORMALS[from.side]);
  cost[s0] = 0;
  heap.push(remaining(s0 >> 3), s0);
  let best = -1;
  let bestCost = Infinity;
  let bestTail: Point[] = [];
  while (heap.size > 0) {
    const { cost: f, state } = heap.pop();
    const n = state >> 3;
    const c = cost[state]!;
    if (f > c + remaining(n) + 1e-9) continue;
    if (f >= bestCost) break;
    const d = state & 7;
    const a = pointOf(n);
    const tail = finish(a, d, bestCost - c);
    if (tail && c + tail.cost < bestCost) [best, bestCost, bestTail] = [state, c + tail.cost, tail.points];
    const i = n % W;
    const j = (n - i) / W;
    for (let nd = 0; nd < 8; nd++) {
      const turn = turnCost(d, nd);
      if (turn === Infinity) continue;
      const ni = i + DIRS[nd]!.x;
      const nj = j + DIRS[nd]!.y;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const next = nodeAt(ni, nj);
      if (blocked[next]) continue;
      const b = pointOf(next);
      if (nd % 2 === 1 && blockedAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) continue;
      const length = nd % 2 === 1 ? g * Math.SQRT2 : g;
      const step = length + turn + lineCost(a, b, nd, length, next);
      const target = next * 8 + nd;
      if (c + step < cost[target]!) {
        cost[target] = c + step;
        previous[target] = state;
        heap.push(c + step + remaining(next), target);
      }
    }
  }
  if (best < 0) return undefined;
  const path: Point[] = [];
  for (let state = best; state >= 0; state = previous[state]!) path.unshift(pointOf(state >> 3));
  return simplifyPath([from.point, ...path, ...bestTail]).slice(1, -1);
}

/**
 * Tracé Typon pour `avoidRoutes`. Avec `avoid`, contournement des formes et des flèches ; sans chemin (ou sans
 * `avoid`), le tracé octilinéaire direct : collisions acceptées, la flèche garde son style.
 */
export function octilinearRouter(avoid: boolean, bends: BendCosts = DEFAULT_BEND_COSTS): Router {
  return {
    straight: true,
    segments: pathSegments,
    conflict: (s, t) => segmentsCross(s, t) || segmentsOverlap(s, t) > 0.5,
    route: (from, to, obstacles, occupied, attract, options, seed) =>
      (avoid ? routeOctilinear(from, to, obstacles, occupied, attract, options, seed, true, bends) : undefined) ??
      routeOctilinear(from, to, [], [], attract, options, seed, false, bends),
  };
}
