import type { EdgeModel, PageModel, Point, ShapeModel } from '../model/types';

/**
 * Élément sous un point de la page (clic, survol). En volume (iso), le plus proche de la caméra gagne : celui que
 * le rayon visé touche le plus haut (la caméra est au-dessus de la scène, le rayon descend). À hauteur égale (et à
 * plat, où tout est au sol), le plus haut dans l'ordre de dessin : un enfant de conteneur passe avant son
 * conteneur, une arête dessinée après une forme avant elle.
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
   * Volumes (vue iso) : hauteur de la base d'un élément. Il se teste alors sur toute sa hauteur, du dessus à la
   * base (côtés compris), et pas seulement au dessus. Absent = au dessus seulement.
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

/** Pas (unités de page) entre deux hauteurs testées sous le dessus d'un volume, et nombre maximal de hauteurs. */
const VOLUME_STEP = 1;
const VOLUME_MAX_STEPS = 256;

export function pickElement(page: PageModel, point: Point, options: PickOptions): PickedElement | undefined {
  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  const candidates: PickedElement[] = [
    ...page.shapes.map((element) => ({ type: 'shape' as const, element })),
    ...page.edges.map((element) => ({ type: 'edge' as const, element })),
  ].sort((a, b) => b.element.z - a.element.z);

  let best: { candidate: PickedElement; at: number } | undefined;
  for (const candidate of candidates) {
    const { element } = candidate;
    if (!element.visible || hiddenLayers.has(element.layerId)) continue;
    const height = options.heightOf?.(element.id) ?? 0;
    // Rien de ce qui reste ne peut être touché plus haut que le meilleur (les éléments ne dépassent pas leur dessus).
    if (best && height <= best.at) continue;
    const target = height !== 0 && options.pointAtHeight ? options.pointAtHeight(height) : point;
    const at = hitHeight(candidate, height, target, options);
    if (at !== undefined && (!best || at > best.at)) best = { candidate, at };
  }
  return best?.candidate;
}

/** Hauteur où le rayon visé touche l'élément (son dessus, ou plus bas sur ses côtés), `undefined` s'il le manque. */
function hitHeight(candidate: PickedElement, height: number, target: Point, options: PickOptions): number | undefined {
  if (candidate.type === 'edge') {
    const route = options.edgeRoute(candidate.element.id);
    return route && distanceToPolyline(target, route) <= options.edgeTolerance ? height : undefined;
  }
  const shape = candidate.element;
  if (options.pickable && !options.pickable(shape)) return undefined;
  if (shapeContains(shape, target, options.contains)) return height;
  const base = options.baseOf?.(shape.id);
  if (base === undefined || base >= height || !options.pointAtHeight) return undefined;
  return volumeHit(shape, height, base, options.pointAtHeight, options.contains);
}

/**
 * Hauteur où le rayon visé entre dans le volume (contour extrudé de `base` à `top`), `undefined` s'il le manque.
 * Le point visé glisse en ligne droite sur la page quand la hauteur varie : on teste les hauteurs du dessus vers
 * la base au pas `VOLUME_STEP` le long de ce segment, après un rejet par les bornes.
 */
function volumeHit(
  shape: ShapeModel,
  top: number,
  base: number,
  at: (height: number) => Point,
  contains?: (shape: ShapeModel, point: Point) => boolean,
): number | undefined {
  const a = at(top);
  const b = at(base);
  const { x, y, width, height } = shape.bounds;
  if (Math.max(a.x, b.x) < x || Math.min(a.x, b.x) > x + width) return undefined;
  if (Math.max(a.y, b.y) < y || Math.min(a.y, b.y) > y + height) return undefined;
  const steps = Math.min(VOLUME_MAX_STEPS, Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / VOLUME_STEP)));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (shapeContains(shape, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, contains)) {
      return top - (top - base) * t;
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
