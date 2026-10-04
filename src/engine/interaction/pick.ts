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
   * Élément debout (silhouette de l'Actor) : hauteur de sa base. Il se teste alors sur toute sa hauteur, du dessus
   * à la base, et pas seulement au dessus. Absent = au dessus seulement (blocs).
   */
  baseOf?: (elementId: string) => number | undefined;
  /**
   * Le point (déjà dans les bornes) est-il dans la forme ? Sa définition répond (un losange ne se clique pas dans
   * ses coins vides). Absent = les bornes.
   */
  contains?: (shape: ShapeModel, point: Point) => boolean;
  /** La forme se prend-elle au clic (un groupe invisible seulement s'il porte un lien) ? Absent = toutes. */
  pickable?: (shape: ShapeModel) => boolean;
}

/** Hauteurs testées sous le dessus d'un élément debout. */
const STANDING_STEPS = 12;

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
      if (options.pickable && !options.pickable(candidate.element)) continue;
      if (shapeContains(candidate.element, target, options.contains)) return candidate;
      const base = options.baseOf?.(element.id);
      if (base !== undefined && base < height && options.pointAtHeight) {
        const at = options.pointAtHeight;
        for (let step = 1; step <= STANDING_STEPS; step++) {
          const p = at(height - ((height - base) * step) / STANDING_STEPS);
          if (shapeContains(candidate.element, p, options.contains)) return candidate;
        }
      }
    } else {
      const route = options.edgeRoute(element.id);
      if (route && distanceToPolyline(target, route) <= options.edgeTolerance) return candidate;
    }
  }
  return undefined;
}

/** Point dans la forme : dans ses bornes, puis selon `contains` (sa définition) s'il est donné. */
export function shapeContains(
  shape: ShapeModel,
  p: Point,
  contains?: (shape: ShapeModel, point: Point) => boolean,
): boolean {
  const { x, y, width, height } = shape.bounds;
  if (p.x < x || p.x > x + width || p.y < y || p.y > y + height) return false;
  return contains ? contains(shape, p) : true;
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
