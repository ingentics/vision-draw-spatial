import type { EdgeModel, PageModel, Point, ShapeModel } from '../model/types';

/**
 * Élément sous un point de la page (clic, survol). Le plus haut dans l'ordre de dessin gagne :
 * un enfant de conteneur passe avant son conteneur, une arête dessinée après une forme avant elle.
 */

export type PickedElement = { type: 'shape'; element: ShapeModel } | { type: 'edge'; element: EdgeModel };

export interface PickOptions {
  /** Tolérance autour des arêtes, en unités de page (ex. 6 px écran / zoom). */
  edgeTolerance: number;
  /** Tracé dessiné d'une arête (calculé au rendu), en coordonnées page. */
  edgeRoute: (edgeId: string) => Point[] | undefined;
}

export function pickElement(page: PageModel, point: Point, options: PickOptions): PickedElement | undefined {
  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  const candidates: PickedElement[] = [
    ...page.shapes.map((element) => ({ type: 'shape' as const, element })),
    ...page.edges.map((element) => ({ type: 'edge' as const, element })),
  ].sort((a, b) => b.element.z - a.element.z);

  for (const candidate of candidates) {
    const { element } = candidate;
    if (!element.visible || hiddenLayers.has(element.layerId)) continue;
    if (candidate.type === 'shape') {
      // Les groupes sont invisibles : on ne les attrape que s'ils portent un lien.
      if (candidate.element.kind === 'group' && !candidate.element.link) continue;
      if (shapeContains(candidate.element, point)) return candidate;
    } else {
      const route = options.edgeRoute(element.id);
      if (route && distanceToPolyline(point, route) <= options.edgeTolerance) return candidate;
    }
  }
  return undefined;
}

export function shapeContains(shape: ShapeModel, p: Point): boolean {
  const { x, y, width, height } = shape.bounds;
  if (shape.kind === 'ellipse') {
    const rx = width / 2;
    const ry = height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (p.x - (x + rx)) / rx;
    const dy = (p.y - (y + ry)) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height;
}

export function distanceToPolyline(p: Point, points: Point[]): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return Math.hypot(p.x - points[0]!.x, p.y - points[0]!.y);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, distanceToSegment(p, points[i - 1]!, points[i]!));
  return best;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
