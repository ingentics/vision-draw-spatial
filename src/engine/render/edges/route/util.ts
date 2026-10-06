import type { Point, Rect } from '../../../model/types';

/** Petits calculs partagés du tracé (centre, lecture d'un nombre du style, intersection de segments). */

export function center(b: Rect): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export function number(value: string | undefined, fallback: number): number {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Intersection des segments [p0, p1] et [p2, p3] (mxUtils.intersection), ou `undefined`. */
export function intersection(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): Point | undefined {
  const denom = (y3 - y2) * (x1 - x0) - (x3 - x2) * (y1 - y0);
  const ua = ((x3 - x2) * (y0 - y2) - (y3 - y2) * (x0 - x2)) / denom;
  const ub = ((x1 - x0) * (y0 - y2) - (y1 - y0) * (x0 - x2)) / denom;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) return { x: x0 + ua * (x1 - x0), y: y0 + ua * (y1 - y0) };
  return undefined;
}
