import type { Point, Rect } from '../../../model/types';
import { SIDE_NORMALS } from '../../edgeEnds';
import { ATTRACT_COST, BEND_COST, Heap, OVERLAP_COST, SEED_JITTER, inside, out } from '../routing';
import type { AvoidOptions, Port, Router, Segment } from '../routing';
import { seededUnit } from '../seed';
import {
  cross,
  distance,
  inflate,
  overlapLength,
  segmentsCross as crossing,
  simplifyPath,
} from '../../../model/geometry';

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

const DEFAULT_BEND_COSTS: BendCosts = { diagonal: BEND_COST / 2, right: BEND_COST };
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
  return overlapLength(0, length, along(t.a), along(t.b));
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
  const stub = Math.max(options.stub, options.clearance + 1);
  const start = out(from, stub);
  const goalStub = out(to, stub);
  const blocks = avoid ? obstacles.map((r) => inflate(r, options.clearance)) : [];
  if (blocks.some((b) => inside(b, start) || inside(b, goalStub))) return undefined;
  const grid = new OctilinearGrid(start, goalStub, blocks, avoid ? occupied : [], Math.max(MIN_STEP, options.spacing));
  return new OctilinearSearch(grid, from, to, { stub, goalStub, attract, options, seed, bends }).run();
}

/**
 * Grille de recherche, alignée sur le point de départ et étendue de `WINDOW` autour des deux bouts : nœuds bloqués
 * par les formes, et axes des flèches déjà tracées qui passent par chaque nœud.
 */
class OctilinearGrid {
  readonly x0: number;
  readonly y0: number;
  /** Nombre de nœuds en largeur et en hauteur. */
  readonly W: number;
  readonly H: number;
  /** Formes (écartées) qui touchent la grille. */
  readonly near: Rect[];
  readonly blocked: Uint8Array;
  /** Flèches déjà tracées qui touchent la grille. */
  readonly lines: Segment[];
  /** Par nœud, les axes des flèches qui y passent (bits 0 à 3). */
  readonly mask: Uint8Array;

  constructor(
    start: Point,
    goalStub: Point,
    blocks: Rect[],
    occupied: readonly Segment[],
    readonly g: number,
  ) {
    // Grille alignée sur le point de départ ; on rejoint la ligne d'arrivée (perpendiculaire au côté) en fin de tracé.
    const ext = (a: number, b: number, o: number) => {
      const lo = o - Math.ceil((o - Math.min(a, b) + WINDOW) / g) * g;
      const hi = o + Math.ceil((Math.max(a, b) - o + WINDOW) / g) * g;
      return [lo, Math.round((hi - lo) / g) + 1] as const;
    };
    [this.x0, this.W] = ext(start.x, goalStub.x, start.x);
    [this.y0, this.H] = ext(start.y, goalStub.y, start.y);
    const box = { x: this.x0, y: this.y0, width: (this.W - 1) * g, height: (this.H - 1) * g };
    this.near = blocks.filter(
      (b) => b.x < box.x + box.width && b.x + b.width > box.x && b.y < box.y + box.height && b.y + b.height > box.y,
    );
    this.blocked = new Uint8Array(this.W * this.H);
    if (this.near.length > 0)
      for (let n = 0; n < this.W * this.H; n++) this.blocked[n] = this.blockedAt(this.pointOf(n)) ? 1 : 0;
    this.lines = occupied.filter(
      (l) =>
        Math.max(l.a.x, l.b.x) >= box.x &&
        Math.min(l.a.x, l.b.x) <= box.x + box.width &&
        Math.max(l.a.y, l.b.y) >= box.y &&
        Math.min(l.a.y, l.b.y) <= box.y + box.height,
    );
    this.mask = new Uint8Array(this.W * this.H);
    for (const s of this.lines) this.markLine(s);
  }

  nodeAt(i: number, j: number): number {
    return j * this.W + i;
  }

  pointOf(n: number): Point {
    return { x: this.x0 + (n % this.W) * this.g, y: this.y0 + Math.floor(n / this.W) * this.g };
  }

  blockedAt(p: Point): boolean {
    return this.near.some((b) => inside(b, p));
  }

  segmentBlocked(a: Point, b: Point): boolean {
    if (this.near.length === 0) return false;
    const steps = Math.ceil(distance(a, b) / (this.g / 2));
    for (let k = 1; k < steps; k++)
      if (this.blockedAt({ x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps })) return true;
    return false;
  }

  /** Reporte une flèche déjà tracée sur les nœuds qu'elle traverse (bit de son axe). */
  private markLine(s: Segment): void {
    const { g, x0, y0, W, H } = this;
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const angle = Math.round((Math.atan2(dy, dx) / Math.PI) * 4);
    const axis = (((angle % 4) + 4) % 4) as number;
    const steps = Math.ceil(Math.hypot(dx, dy) / (g / 4));
    for (let k = 0; k <= steps; k++) {
      const i = Math.round((s.a.x + (dx * k) / Math.max(1, steps) - x0) / g);
      const j = Math.round((s.a.y + (dy * k) / Math.max(1, steps) - y0) / g);
      if (i >= 0 && j >= 0 && i < W && j < H) this.mask[this.nodeAt(i, j)]! |= 1 << axis;
    }
  }
}

/** Recherche A* sur la grille ; état = nœud × direction d'arrivée. */
class OctilinearSearch {
  /** Arrivée : repère du côté visé (n = vers l'extérieur, u = le long du côté). */
  private readonly normal: Point;
  private readonly lateral: Point;

  constructor(
    private readonly grid: OctilinearGrid,
    private readonly from: Port,
    private readonly to: Port,
    private readonly params: {
      stub: number;
      goalStub: Point;
      attract: Point | undefined;
      options: AvoidOptions;
      seed: number;
      bends: BendCosts;
    },
  ) {
    this.normal = SIDE_NORMALS[to.side];
    this.lateral = { x: -this.normal.y, y: this.normal.x };
  }

  /** Coût d'un changement de direction ; Infinity au-delà de 90° (angle aigu). */
  private turnCost(a: number, b: number): number {
    const { bends } = this.params;
    return [0, bends.diagonal, bends.right, Infinity, Infinity][turnOf(a, b)]!;
  }

  /** Coût de fréquentation d'un segment (hors longueur et coudes) : flèches longées ou croisées, graine, attirance. */
  private lineCost(a: Point, b: Point, d: number, length: number, n?: number): number {
    const { seed, attract, options } = this.params;
    let cost = 0;
    if (seed !== 0) {
      const key = ['y' + a.y, 'd' + (a.y - a.x), 'x' + a.x, 'e' + (a.y + a.x)][axisOf(d)]!;
      cost += SEED_JITTER * length * seededUnit(seed, key);
    }
    if (attract)
      cost += ATTRACT_COST * length * (Math.abs((a.x + b.x) / 2 - attract.x) + Math.abs((a.y + b.y) / 2 - attract.y));
    if (n !== undefined) {
      const m = this.grid.mask[n]!;
      if (m & (1 << axisOf(d))) cost += OVERLAP_COST * length;
      if (m & ~(1 << axisOf(d))) cost += options.crossingDetour;
    } else {
      const segment = { a, b };
      for (const s of this.grid.lines) {
        cost += segmentsOverlap(segment, s) * OVERLAP_COST;
        if (segmentsTouch(segment, s)) cost += options.crossingDetour;
      }
    }
    return cost;
  }

  /**
   * Meilleure fin de tracé depuis le nœud `a` (direction d'arrivée `d`), si elle coûte moins que `limit` : coût et
   * points ajoutés, P compris.
   */
  private finish(a: Point, d: number, limit: number): { cost: number; points: Point[] } | undefined {
    const { to, normal, lateral } = this;
    const { stub } = this.params;
    const rel = { x: a.x - to.point.x, y: a.y - to.point.y };
    const along = rel.x * normal.x + rel.y * normal.y;
    const across = rel.x * lateral.x + rel.y * lateral.y;
    const c = Math.abs(across);
    let best: { cost: number; points: Point[] } | undefined;
    const consider = (q: Point, legs: number) => {
      const tail = this.tailCost(a, d, q, legs, Math.min(limit, best?.cost ?? Infinity));
      if (tail && (!best || tail.cost < best.cost)) best = tail;
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
  }

  /** Fin de tracé de `a` (direction `d`) par `q`, si elle est possible et coûte moins que `limit`. */
  private tailCost(
    a: Point,
    d: number,
    q: Point,
    legs: number,
    limit: number,
  ): { cost: number; points: Point[] } | undefined {
    const { goalStub } = this.params;
    const into = this.to.point;
    let cost = 0;
    let dir = d;
    let previous = a;
    // Jusqu'au bout du dernier segment (à `stub` de la forme), puis vers la forme.
    const points = (legs === 0 ? [goalStub, into] : [q, goalStub, into]).filter(
      (p, k, all) => k === 0 || distance(p, all[k - 1]!) > 1e-6,
    );
    const legsOf: Array<{ a: Point; b: Point; d: number; length: number }> = [];
    for (const p of points) {
      const nd = dirOf({ x: p.x - previous.x, y: p.y - previous.y });
      if (nd < 0) return undefined;
      const length = distance(previous, p);
      cost += length + this.turnCost(dir, nd);
      legsOf.push({ a: previous, b: p, d: nd, length });
      [dir, previous] = [nd, p];
    }
    // Contrôles coûteux seulement si la fin peut encore faire mieux. Le dernier segment (dans la zone d'écart de la
    // forme visée) n'est pas contrôlé.
    if (cost >= limit) return undefined;
    for (const leg of legsOf.slice(0, -1)) {
      if (this.grid.segmentBlocked(leg.a, leg.b)) return undefined;
      cost += this.lineCost(leg.a, leg.b, leg.d, leg.length);
    }
    return { cost, points };
  }

  /** Minorant du coût restant (A*) : longueur octilinéaire jusqu'à la forme visée. */
  private remaining(n: number): number {
    const p = this.grid.pointOf(n);
    const [dx, dy] = [Math.abs(p.x - this.to.point.x), Math.abs(p.y - this.to.point.y)];
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  }

  /** Points intermédiaires du meilleur tracé (bouts exclus), ou undefined sans chemin. */
  run(): Point[] | undefined {
    const { grid } = this;
    const { g, x0, y0, W, H } = grid;
    const start = out(this.from, this.params.stub);
    const states = W * H * 8;
    const cost = new Float64Array(states).fill(Infinity);
    const previous = new Int32Array(states).fill(-1);
    const heap = new Heap();
    const s0 =
      grid.nodeAt(Math.round((start.x - x0) / g), Math.round((start.y - y0) / g)) * 8 +
      dirOf(SIDE_NORMALS[this.from.side]);
    cost[s0] = 0;
    heap.push(this.remaining(s0 >> 3), s0);
    let best = -1;
    let bestCost = Infinity;
    let bestTail: Point[] = [];
    while (heap.size > 0) {
      const { cost: f, state } = heap.pop();
      const n = state >> 3;
      const c = cost[state]!;
      if (f > c + this.remaining(n) + 1e-9) continue;
      if (f >= bestCost) break;
      const d = state & 7;
      const a = grid.pointOf(n);
      const tail = this.finish(a, d, bestCost - c);
      if (tail && c + tail.cost < bestCost) [best, bestCost, bestTail] = [state, c + tail.cost, tail.points];
      const i = n % W;
      const j = (n - i) / W;
      for (let nd = 0; nd < 8; nd++) {
        const turn = this.turnCost(d, nd);
        if (turn === Infinity) continue;
        const ni = i + DIRS[nd]!.x;
        const nj = j + DIRS[nd]!.y;
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const next = grid.nodeAt(ni, nj);
        if (grid.blocked[next]) continue;
        const b = grid.pointOf(next);
        if (nd % 2 === 1 && grid.blockedAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })) continue;
        const length = nd % 2 === 1 ? g * Math.SQRT2 : g;
        const step = length + turn + this.lineCost(a, b, nd, length, next);
        const target = next * 8 + nd;
        if (c + step < cost[target]!) {
          cost[target] = c + step;
          previous[target] = state;
          heap.push(c + step + this.remaining(next), target);
        }
      }
    }
    if (best < 0) return undefined;
    const path: Point[] = [];
    for (let state = best; state >= 0; state = previous[state]!) path.unshift(grid.pointOf(state >> 3));
    return simplifyPath([this.from.point, ...path, ...bestTail]).slice(1, -1);
  }
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
