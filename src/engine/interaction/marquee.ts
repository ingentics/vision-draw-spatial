import type { Point, Rect } from '../model/types';

/**
 * Sélection par zone (ticket 60) : rectangle tiré au curseur, en coordonnées écran. Un élément est
 * pris si son emprise à l'écran y est entièrement ; en mode « contact » (Alt), il suffit qu'elle le
 * touche.
 */

/** Rectangle entre deux points écran, quel que soit le sens du glisser. */
export function rectBetween(a: Point, b: Point): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

/**
 * Emprise d'un élément à l'écran : contour d'une forme (`closed`, points dans n'importe quel ordre :
 * on prend leur enveloppe convexe) ou tracé d'une flèche.
 */
export interface Footprint {
  points: Point[];
  closed: boolean;
}

export function marqueeTakes(footprint: Footprint, rect: Rect, touch: boolean): boolean {
  const { points } = footprint;
  if (points.length === 0) return false;
  if (points.every((p) => inside(p, rect))) return true;
  if (!touch) return false;
  if (points.some((p) => inside(p, rect))) return true;
  const outline = footprint.closed ? convexHull(points) : points;
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  const sides = corners.map((c, i) => [c, corners[(i + 1) % 4]!] as const);
  const count = footprint.closed ? outline.length : outline.length - 1;
  for (let i = 0; i < count; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    if (sides.some(([c, d]) => segmentsCross(a, b, c, d))) return true;
  }
  // Rectangle entièrement dans la forme.
  return footprint.closed && insidePolygon(corners[0]!, outline);
}

function inside(p: Point, rect: Rect): boolean {
  return p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Enveloppe convexe (chaîne monotone), dans le sens trigonométrique. */
function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const half = (list: Point[]) => {
    const hull: Point[] = [];
    for (const p of list) {
      while (hull.length >= 2 && cross(hull[hull.length - 2]!, hull[hull.length - 1]!, p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function insidePolygon(p: Point, polygon: Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
