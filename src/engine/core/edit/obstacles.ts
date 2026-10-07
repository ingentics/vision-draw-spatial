import type { Point, Rect } from '../model/types';
import { inflate } from '../model/geometry';

/**
 * Bornes d'un déplacement ou d'un redimensionnement (sujet 241) : des obstacles (ex. régions sœurs d'une région RDD)
 * à ne pas approcher à moins de `gap`. Quand une borne arrête le geste, sa limite est rendue (segment de la ligne en
 * pointillé rouge) : le bord de l'obstacle repoussé de `gap`, sur toute sa longueur.
 */

export type Segment = [Point, Point];

export interface Clamped<T> {
  value: T;
  /** Limites atteintes : segments à montrer. */
  limits: Segment[];
}

const EPSILON = 1e-6;

/** Les intervalles [a, a + la] et [b, b + lb] se recouvrent-ils (bords exclus) ? */
const crosses = (a: number, la: number, b: number, lb: number) => a < b + lb - EPSILON && b < a + la - EPSILON;

const verticalLimit = (x: number, r: Rect): Segment => [
  { x, y: r.y },
  { x, y: r.y + r.height },
];
const horizontalLimit = (y: number, r: Rect): Segment => [
  { x: r.x, y },
  { x: r.x + r.width, y },
];

/**
 * Déplacement `delta` de rectangles `moving` (à leur place d'origine) borné par les obstacles, un axe puis l'autre
 * (le second une fois décalé du premier) : on glisse ainsi le long d'un obstacle. Des deux ordres (x puis y, y puis x),
 * celui qui va le plus près du déplacement demandé (ex. passer en diagonale au-delà du coin d'un obstacle). Un
 * obstacle déjà trop proche à l'origine ne borne que s'il est franchi.
 */
export function clampMove(moving: Rect[], obstacles: Rect[], gap: number, delta: Point): Clamped<Point> {
  const zones = obstacles.map((o) => inflate(o, gap));
  const xFirst = clampAxes(moving, zones, delta, 'x');
  const yFirst = clampAxes(moving, zones, delta, 'y');
  const miss = (d: Point) => Math.hypot(delta.x - d.x, delta.y - d.y);
  const best = miss(yFirst.value) < miss(xFirst.value) ? yFirst : xFirst;
  return { value: best.value, limits: lastLimits(best.limits, best.value, moving) };
}

/** Bornes axe par axe, en commençant par `first`. */
function clampAxes(moving: Rect[], zones: Rect[], delta: Point, first: 'x' | 'y'): Clamped<Point> {
  const limits: Segment[] = [];
  const result = { x: first === 'x' ? delta.x : 0, y: first === 'y' ? delta.y : 0 };
  for (const axis of first === 'x' ? (['x', 'y'] as const) : (['y', 'x'] as const)) {
    let d = delta[axis];
    const across = axis === 'x' ? 'y' : 'x';
    const size = axis === 'x' ? 'width' : 'height';
    const crossSize = axis === 'x' ? 'height' : 'width';
    for (const m of moving) {
      for (const z of zones) {
        // Face-à-face sur l'autre axe, avec le décalage déjà appliqué sur cet axe (0 s'il vient après).
        const shift = axis === first ? 0 : result[across];
        if (!crosses(m[across] + shift, m[crossSize], z[across], z[crossSize])) continue;
        const limit = (at: number): Segment => (axis === 'x' ? verticalLimit(at, z) : horizontalLimit(at, z));
        if (m[axis] + m[size] <= z[axis] + EPSILON && d > z[axis] - (m[axis] + m[size])) {
          d = z[axis] - (m[axis] + m[size]);
          limits.push(limit(z[axis]));
        } else if (m[axis] >= z[axis] + z[size] - EPSILON && d < z[axis] + z[size] - m[axis]) {
          d = z[axis] + z[size] - m[axis];
          limits.push(limit(z[axis] + z[size]));
        }
      }
    }
    result[axis] = d;
  }
  return { value: result, limits };
}

/**
 * Ne garde que les limites effectivement touchées par la position finale (une borne resserrée ensuite par un
 * obstacle plus proche n'est plus montrée).
 */
function lastLimits(limits: Segment[], delta: Point, moving: Rect[]): Segment[] {
  const touched = (s: Segment) => {
    const vertical = s[0].x === s[1].x;
    return moving.some((m) =>
      vertical
        ? Math.abs(m.x + delta.x + m.width - s[0].x) < EPSILON || Math.abs(m.x + delta.x - s[0].x) < EPSILON
        : Math.abs(m.y + delta.y + m.height - s[0].y) < EPSILON || Math.abs(m.y + delta.y - s[0].y) < EPSILON,
    );
  };
  return limits.filter(touched);
}

/**
 * Redimensionnement de `origin` en `next` borné par les obstacles : chaque bord qui avance vers un obstacle en face
 * (recouvrement sur l'autre axe) s'arrête à `gap` de lui. Les rectangles sont des emprises (ex. onglet compris).
 */
export function clampResize(origin: Rect, next: Rect, obstacles: Rect[], gap: number): Clamped<Rect> {
  const zones = obstacles.map((o) => inflate(o, gap));
  const limits: Segment[] = [];
  let left = next.x;
  let right = next.x + next.width;
  let top = next.y;
  let bottom = next.y + next.height;
  for (const z of zones) {
    if (!crosses(top, bottom - top, z.y, z.height)) continue;
    if (right > origin.x + origin.width && origin.x + origin.width <= z.x + EPSILON && right > z.x) {
      right = z.x;
      limits.push(verticalLimit(z.x, z));
    }
    if (left < origin.x && origin.x >= z.x + z.width - EPSILON && left < z.x + z.width) {
      left = z.x + z.width;
      limits.push(verticalLimit(z.x + z.width, z));
    }
  }
  for (const z of zones) {
    if (!crosses(left, right - left, z.x, z.width)) continue;
    if (bottom > origin.y + origin.height && origin.y + origin.height <= z.y + EPSILON && bottom > z.y) {
      bottom = z.y;
      limits.push(horizontalLimit(z.y, z));
    }
    if (top < origin.y && origin.y >= z.y + z.height - EPSILON && top < z.y + z.height) {
      top = z.y + z.height;
      limits.push(horizontalLimit(z.y + z.height, z));
    }
  }
  // Seules les limites où un bord s'est arrêté au final (un obstacle plus proche a pu resserrer la borne).
  const kept = limits.filter((s) =>
    s[0].x === s[1].x
      ? Math.abs(s[0].x - left) < EPSILON || Math.abs(s[0].x - right) < EPSILON
      : Math.abs(s[0].y - top) < EPSILON || Math.abs(s[0].y - bottom) < EPSILON,
  );
  return { value: { x: left, y: top, width: right - left, height: bottom - top }, limits: kept };
}

/**
 * Limite telle qu'elle est montrée (sujet 316) : écartée de `offset` du côté opposé aux rectangles arrêtés `stopped`
 * (pour ne pas être recouverte par leur cadre de sélection), et prolongée de `extension` à chaque bout.
 */
export function shownLimit(limit: Segment, stopped: Rect[], offset: number, extension: number): Segment {
  const [a, b] = limit;
  const vertical = a.x === b.x;
  const at = vertical ? a.x : a.y;
  // Côté des rectangles arrêtés : celui du plus proche de la limite.
  const centers = stopped.map((r) => (vertical ? r.x + r.width / 2 : r.y + r.height / 2));
  const nearest = centers.reduce((best, c) => (Math.abs(c - at) < Math.abs(best - at) ? c : best), centers[0] ?? at);
  const shifted = at + (nearest <= at ? offset : -offset);
  const from = Math.min(vertical ? a.y : a.x, vertical ? b.y : b.x) - extension;
  const to = Math.max(vertical ? a.y : a.x, vertical ? b.y : b.x) + extension;
  return vertical
    ? [
        { x: shifted, y: from },
        { x: shifted, y: to },
      ]
    : [
        { x: from, y: shifted },
        { x: to, y: shifted },
      ];
}
