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
 * Tracé courbe (`curved=1`), comme draw.io : courbes quadratiques contrôlées par chaque coude, passant
 * par le milieu des segments intermédiaires ; deux points : segment droit.
 */
export function curveThrough(points: Point[], steps = 12): Point[] {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]!];
  const quad = (from: Point, control: Point, to: Point) => {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const k0 = (1 - t) * (1 - t);
      const k1 = 2 * (1 - t) * t;
      const k2 = t * t;
      result.push({ x: k0 * from.x + k1 * control.x + k2 * to.x, y: k0 * from.y + k1 * control.y + k2 * to.y });
    }
  };
  let from = points[0]!;
  for (let i = 1; i < points.length - 2; i++) {
    const control = points[i]!;
    const next = points[i + 1]!;
    const middle = { x: (control.x + next.x) / 2, y: (control.y + next.y) / 2 };
    quad(from, control, middle);
    from = middle;
  }
  quad(from, points[points.length - 2]!, points[points.length - 1]!);
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

/**
 * Angle (radians, espace page) d'un texte qui suit la flèche : celui du segment où tombe `position`
 * (même parcours que `labelPoint`), ramené dans ]-π/2, π/2] pour que le texte ne soit jamais à l'envers.
 */
export function labelAngle(points: Point[], position: number): number {
  if (points.length < 2) return 0;
  const total = length(points);
  let remaining = ((position + 1) / 2) * total;
  let angle = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = distance(a, b);
    if (segment > 0) angle = Math.atan2(b.y - a.y, b.x - a.x);
    if (remaining <= segment && segment > 0) break;
    remaining -= segment;
  }
  if (angle > Math.PI / 2 + 1e-9) angle -= Math.PI;
  else if (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI;
  return angle;
}

/**
 * Position le long d'un tracé du point du tracé le plus proche de `point`, comme `placement.position` :
 * -1 = début, 0 = milieu, 1 = fin.
 */
export function positionAlong(points: Point[], point: Point): number {
  const total = length(points);
  if (points.length < 2 || total === 0) return 0;
  let best = { distance: Infinity, along: 0 };
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = distance(a, b);
    const t =
      segment === 0
        ? 0
        : Math.min(1, Math.max(0, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / segment ** 2));
    const closest = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const d = distance(closest, point);
    if (d < best.distance) best = { distance: d, along: travelled + t * segment };
    travelled += segment;
  }
  return (best.along / total) * 2 - 1;
}

/**
 * Placement d'un label (inverse de `labelPoint`) pour qu'il soit dessiné en `point` : position le long
 * du tracé du point le plus proche, et distance perpendiculaire (même signe que `labelPoint`) ; le
 * décalage libre `offset` est gardé tel quel.
 */
export function placementAt(points: Point[], point: Point, offset: Point = { x: 0, y: 0 }): EdgeLabelPlacement {
  const target = { x: point.x - offset.x, y: point.y - offset.y };
  const position = positionAlong(points, target);
  const onRoute = labelPoint(points, { position, distance: 0, offset: { x: 0, y: 0 } });
  // Direction du segment au point trouvé (celle qu'utilise `labelPoint`).
  const ahead = labelPoint(points, { position: Math.min(position + 1e-6, 1), distance: 0, offset: { x: 0, y: 0 } });
  const behind = labelPoint(points, { position: Math.max(position - 1e-6, -1), distance: 0, offset: { x: 0, y: 0 } });
  const length = Math.hypot(ahead.x - behind.x, ahead.y - behind.y);
  const u = length === 0 ? { x: 1, y: 0 } : { x: (ahead.x - behind.x) / length, y: (ahead.y - behind.y) / length };
  const distanceAcross = (target.x - onRoute.x) * u.y - (target.y - onRoute.y) * u.x;
  return { position, distance: distanceAcross, offset };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
