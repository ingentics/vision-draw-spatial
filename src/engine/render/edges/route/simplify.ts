import type { Point } from '../../../model/types';

/** Nettoyage d'un tracé : points confondus et points alignés intermédiaires. */

/** Retire les points dupliqués et les points alignés intermédiaires. */
export function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue;
    result.push(p);
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3) as [Point, Point, Point];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
      if (Math.abs(cross) < 1e-6 && dot > 0) result.splice(-2, 1);
      else break;
    }
  }
  return result;
}
