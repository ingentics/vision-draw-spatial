import { segmentIntersection } from '../../../model/geometry';
import type { Point } from '../../../model/types';

/** Petits calculs partagés du tracé (lecture d'un nombre du style, intersection de segments). */

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
  return segmentIntersection({ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 });
}
