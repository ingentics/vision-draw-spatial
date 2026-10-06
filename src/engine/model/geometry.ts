import type { Point, Rect } from './types';

/** Petits calculs de géométrie plane partagés (points, rectangles, segments, polygones), en pixels de page. */

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Le point est-il dans le rectangle, bord compris ? */
export function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** Le rectangle `inner` est-il entièrement dans `outer`, bords compris ? */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

/** Plus petit rectangle contenant tous les points ; undefined sans point. */
export function boundsOfPoints(points: readonly Point[]): Rect | undefined {
  if (points.length === 0) return undefined;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Plus petit rectangle contenant tous les rectangles ; undefined sans rectangle. */
export function unionOf(rects: readonly Rect[]): Rect | undefined {
  return boundsOfPoints(
    rects.flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ]),
  );
}

/** Produit vectoriel de `o → a` et `o → b` : positif si `b` est à gauche de `o → a` (repère mathématique). */
export function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Les segments `[a, b]` et `[c, d]` se croisent-ils franchement (chacun de part et d'autre de l'autre, au-delà de
 * `epsilon`) ? Un bout posé sur l'autre segment, ou des segments alignés, ne comptent pas.
 */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point, epsilon = 0): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return (
    ((d1 > epsilon && d2 < -epsilon) || (d1 < -epsilon && d2 > epsilon)) &&
    ((d3 > epsilon && d4 < -epsilon) || (d3 < -epsilon && d4 > epsilon))
  );
}

/** Point d'intersection des segments `[a, b]` et `[c, d]`, bouts compris (mxUtils.intersection), ou undefined. */
export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const denominator = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
  if (denominator === 0) return undefined;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return undefined;
  return { x: a.x + ua * (b.x - a.x), y: a.y + ua * (b.y - a.y) };
}

/** Carré de la distance de `p` au segment `[a, b]` (mxUtils.ptSegDistSq). */
export function segmentDistanceSquared(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const x = a.x + t * dx - p.x;
  const y = a.y + t * dy - p.y;
  return x * x + y * y;
}

/** Distance de `p` au segment `[a, b]`. */
export function segmentDistance(p: Point, a: Point, b: Point): number {
  return Math.sqrt(segmentDistanceSquared(p, a, b));
}

/** Point dans un polygone (règle pair-impair), bord compris à la précision près. */
export function insidePolygon(polygon: readonly Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (segmentDistance(p, a, b) < 1e-6) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Retire d'un tracé les points confondus et ceux alignés avec leurs voisins (à `epsilon` près). */
export function simplifyPath(path: readonly Point[], epsilon = 1e-6): Point[] {
  const result: Point[] = [];
  for (const p of path) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.x - p.x) < epsilon && Math.abs(last.y - p.y) < epsilon) continue;
    const before = result[result.length - 2];
    if (before && last && Math.abs(cross(before, last, p)) < epsilon) result[result.length - 1] = p;
    else result.push(p);
  }
  return result;
}
