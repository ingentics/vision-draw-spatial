import type { Point, Rect } from '../../../model/types';
import { simplifyPath, inflate } from '../../../model/geometry';
import { SIDE_NORMALS } from '../../edgeEnds';
import {
  ATTRACT_COST,
  BEND_COST,
  DEFAULT_AVOID_OPTIONS,
  Heap,
  OVERLAP_COST,
  SEED_JITTER,
  inside,
  out,
} from '../routing';
import type { AvoidOptions, Port, Router, Segment } from '../routing';
import { seededUnit } from '../seed';

/**
 * Tracé orthogonal de l'ancrage automatique (SPEC §14.1) : plus court chemin sur une grille tirée des formes et des
 * flèches déjà tracées, qui contourne les formes et évite de longer ou de croiser les autres flèches.
 */

/** Marge de la zone de recherche autour des deux bouts. */
const WINDOW = 300;

/** Directions de déplacement sur la grille : droite, bas, gauche, haut. */
const DIRS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
const dirIndex = (d: Point) => DIRS.findIndex((v) => v.x === d.x && v.y === d.y);

/** Longueur commune de deux segments colinéaires (0 s'ils ne le sont pas). */
export function overlap(s: Segment, t: Segment): number {
  const vertical = s.a.x === s.b.x;
  if (vertical !== (t.a.x === t.b.x)) return 0;
  if (vertical ? Math.abs(s.a.x - t.a.x) > 0.5 : Math.abs(s.a.y - t.a.y) > 0.5) return 0;
  const [s0, s1] = vertical ? [s.a.y, s.b.y] : [s.a.x, s.b.x];
  const [t0, t1] = vertical ? [t.a.y, t.b.y] : [t.a.x, t.b.x];
  return Math.max(0, Math.min(Math.max(s0, s1), Math.max(t0, t1)) - Math.max(Math.min(s0, s1), Math.min(t0, t1)));
}

/** Vrai si deux segments perpendiculaires se croisent. */
export function crosses(s: Segment, t: Segment): boolean {
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

/**
 * Tracé orthogonal de `from` à `to` qui contourne `obstacles` (écartés de `options.clearance`) et évite de longer
 * `occupied` : premier et dernier segments perpendiculaires aux côtés, puis plus court chemin (coudes, superpositions
 * et croisements pénalisés). Renvoie les points intermédiaires (bouts exclus), ou undefined sans chemin.
 */
export function routeAround(
  from: Port,
  to: Port,
  obstacles: readonly Rect[],
  occupied: readonly Segment[],
  attract?: Point,
  options: AvoidOptions = DEFAULT_AVOID_OPTIONS,
  seed = 0,
): Point[] | undefined {
  // Le premier segment doit sortir de la zone d'écart de sa forme.
  const stub = Math.max(options.stub, options.clearance + 1);
  const start = out(from, stub);
  const goal = out(to, stub);
  const blocks = obstacles.map((r) => inflate(r, options.clearance));
  if (blocks.some((b) => inside(b, start) || inside(b, goal))) return undefined;

  const { X, Y, near, lines } = sparseGrid(start, goal, blocks, occupied, options.spacing);
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
  const first = dirIndex(SIDE_NORMALS[from.side]);
  const inward = dirIndex({ x: -SIDE_NORMALS[to.side].x, y: -SIDE_NORMALS[to.side].y });
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
      const step = stepCost({ a, b }, nd !== d, lines, attract, options, seed);
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

/**
 * Grille creuse de la recherche : lignes des bouts, des bords des formes proches et des voies parallèles aux flèches
 * déjà tracées, dans une fenêtre de `WINDOW` autour des deux bouts.
 */
function sparseGrid(
  start: Point,
  goal: Point,
  blocks: Rect[],
  occupied: readonly Segment[],
  spacing: number,
): { X: number[]; Y: number[]; near: Rect[]; lines: Segment[] } {
  const box = {
    x0: Math.min(start.x, goal.x) - WINDOW,
    y0: Math.min(start.y, goal.y) - WINDOW,
    x1: Math.max(start.x, goal.x) + WINDOW,
    y1: Math.max(start.y, goal.y) + WINDOW,
  };
  const near = blocks.filter((b) => b.x < box.x1 && b.x + b.width > box.x0 && b.y < box.y1 && b.y + b.height > box.y0);
  const lines = occupied.filter(
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
  for (const s of lines) {
    if (s.a.x === s.b.x) xs.add(s.a.x - spacing).add(s.a.x + spacing);
    else ys.add(s.a.y - spacing).add(s.a.y + spacing);
  }
  const X = [...xs].filter((x) => x >= box.x0 && x <= box.x1).sort((a, b) => a - b);
  const Y = [...ys].filter((y) => y >= box.y0 && y <= box.y1).sort((a, b) => a - b);
  return { X, Y, near, lines };
}

/** Coût d'un pas de grille : longueur, coude, graine, attirance, flèches longées ou croisées. */
function stepCost(
  segment: Segment,
  turning: boolean,
  lines: readonly Segment[],
  attract: Point | undefined,
  options: AvoidOptions,
  seed: number,
): number {
  const { a, b } = segment;
  const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  let step = length + (turning ? BEND_COST : 0);
  // À coût égal, tourner près du bout `attract` (là où le faisceau converge) : les faisceaux s'emboîtent.
  // Graine : léger biais par couloir, qui fait choisir un autre détour parmi ceux de coût voisin.
  if (seed !== 0) step += SEED_JITTER * length * seededUnit(seed, a.x === b.x ? `x${a.x}` : `y${a.y}`);
  if (attract)
    step += ATTRACT_COST * length * (Math.abs((a.x + b.x) / 2 - attract.x) + Math.abs((a.y + b.y) / 2 - attract.y));
  for (const s of lines) {
    step += overlap(segment, s) * OVERLAP_COST;
    if (stepCrosses(segment, s)) step += options.crossingDetour;
  }
  return step;
}

export const ORTHOGONAL_ROUTER: Router = {
  straight: false,
  segments: segmentsOf,
  conflict: (s, t) => crosses(s, t) || overlap(s, t) > 0.5,
  route: routeAround,
};
