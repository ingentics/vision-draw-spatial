import type { EdgeModel, Rect, ShapeModel } from './types';

/** Emprise d'une page : toutes ses formes et les points de ses arêtes ; rectangle nul si vide. */
export function computeBounds(shapes: ShapeModel[], edges: EdgeModel[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const { bounds: b } of shapes) {
    add(b.x, b.y);
    add(b.x + b.width, b.y + b.height);
  }
  for (const edge of edges) {
    for (const p of [edge.sourcePoint, edge.targetPoint, ...edge.points]) if (p) add(p.x, p.y);
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
