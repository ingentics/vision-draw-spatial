import type { EdgeLabelPlacement, Point } from '../../model/types';

export function length(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!);
  return total;
}

/** Vecteur unitaire du segment `from → to` (nul si les points sont confondus). */
export function unit(from: Point, to: Point): Point {
  const d = distance(from, to);
  return d === 0 ? { x: 0, y: 0 } : { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
}

/** Raccourcit le début ou la fin d'une polyligne (sans jamais la retourner). */
export function shorten(points: Point[], atStart: number, atEnd: number): Point[] {
  if (points.length < 2) return points;
  const result = points.map((p) => ({ ...p }));
  if (atEnd > 0) {
    const a = result[result.length - 2]!;
    const b = result[result.length - 1]!;
    const k = Math.min(atEnd, distance(a, b));
    const u = unit(a, b);
    result[result.length - 1] = { x: b.x - u.x * k, y: b.y - u.y * k };
  }
  if (atStart > 0) {
    const a = result[0]!;
    const b = result[1]!;
    const k = Math.min(atStart, distance(a, b));
    const u = unit(a, b);
    result[0] = { x: a.x + u.x * k, y: a.y + u.y * k };
  }
  return result;
}

/** Arrondit les angles intérieurs (`rounded=1`), rayon borné à la moitié des segments adjacents. */
export function roundCorners(points: Point[], radius: number, steps = 8): Point[] {
  if (points.length < 3 || radius <= 0) return points;
  const result: Point[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const corner = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(radius, distance(prev, corner) / 2, distance(corner, next) / 2);
    const u0 = unit(corner, prev);
    const u1 = unit(corner, next);
    const a = { x: corner.x + u0.x * r, y: corner.y + u0.y * r };
    const b = { x: corner.x + u1.x * r, y: corner.y + u1.y * r };
    // Courbe de Bézier quadratique de a à b, contrôlée par le coin.
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const k0 = (1 - t) * (1 - t);
      const k1 = 2 * (1 - t) * t;
      const k2 = t * t;
      result.push({ x: k0 * a.x + k1 * corner.x + k2 * b.x, y: k0 * a.y + k1 * corner.y + k2 * b.y });
    }
  }
  result.push(points[points.length - 1]!);
  return result;
}

/**
 * Position d'un label d'arête (comme mxGraphView.getPoint) : `position` de -1 (source) à 1 (cible)
 * le long de la polyligne, `distance` perpendiculaire au segment, puis décalage libre.
 */
export function labelPoint(points: Point[], placement: EdgeLabelPlacement): Point {
  if (points.length === 0) return { x: placement.offset.x, y: placement.offset.y };
  const total = length(points);
  let remaining = ((placement.position + 1) / 2) * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = distance(a, b);
    if (remaining <= segment || i === points.length - 1) {
      const t = segment === 0 ? 0 : Math.min(remaining / segment, 1);
      const u = unit(a, b);
      return {
        x: a.x + (b.x - a.x) * t + u.y * placement.distance + placement.offset.x,
        y: a.y + (b.y - a.y) * t - u.x * placement.distance + placement.offset.y,
      };
    }
    remaining -= segment;
  }
  return points[0]!;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
