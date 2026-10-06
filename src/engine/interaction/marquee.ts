import type { Point, Rect } from '../model/types';
import { cross, insidePolygon, rectContains, segmentsCross } from '../model/geometry';

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
  if (points.every((p) => rectContains(rect, p))) return true;
  if (!touch) return false;
  if (points.some((p) => rectContains(rect, p))) return true;
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
  return footprint.closed && insidePolygon(outline, corners[0]!);
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
