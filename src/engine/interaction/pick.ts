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
  /**
   * Volumes (vue iso) : hauteur à laquelle tester un élément (dessus d'un bloc), et point de la
   * page visé à cette hauteur. Absents = tout est au sol.
   */
  heightOf?: (elementId: string) => number;
  pointAtHeight?: (height: number) => Point;
  /**
   * Contour réel d'une forme (polygone, coordonnées page) : un losange ne se clique pas dans ses coins
   * vides. Absent = bornes (ellipse exacte).
   */
  outlineOf?: (shape: ShapeModel) => Point[] | undefined;
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
    const height = options.heightOf?.(element.id) ?? 0;
    const target = height !== 0 && options.pointAtHeight ? options.pointAtHeight(height) : point;
    if (candidate.type === 'shape') {
      // Les groupes sont invisibles : on ne les attrape que s'ils portent un lien.
      if (candidate.element.kind === 'group' && !candidate.element.link) continue;
      if (shapeContains(candidate.element, target, options.outlineOf?.(candidate.element))) return candidate;
    } else {
      const route = options.edgeRoute(element.id);
      if (route && distanceToPolyline(target, route) <= options.edgeTolerance) return candidate;
    }
  }
  return undefined;
}

export function shapeContains(shape: ShapeModel, p: Point, outline?: Point[]): boolean {
  const { x, y, width, height } = shape.bounds;
  if (p.x < x || p.x > x + width || p.y < y || p.y > y + height) return false;
  if (outline && outline.length >= 3 && shape.kind !== 'rectangle' && shape.kind !== 'ellipse')
    return insidePolygon(outline, p);
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

/** Point dans un polygone (règle pair-impair), bord compris à la précision près. */
export function insidePolygon(polygon: Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (distanceToSegment(p, a, b) < 1e-6) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
