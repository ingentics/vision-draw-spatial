import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import { distance, segmentDistance } from '../model/geometry';

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
   * Morceaux dessinés d'une arête qui ne montre pas tout son tracé (flèche coupée non sélectionnée, ticket 219) : ils
   * remplacent le tracé pour le clic. Absent ou `undefined` = le tracé.
   */
  edgePieces?: (edgeId: string) => Point[][] | undefined;
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
  /**
   * Silhouette debout (Actor en iso / 3D) : hauteur où le rayon visé la touche (`at`, `undefined` s'il la manque), à
   * la place du test des bornes et du volume. `undefined` = pas une silhouette (test habituel).
   */
  standingHit?: (shape: ShapeModel) => { at: number | undefined } | undefined;
  /** Emprise prise au clic d'une forme qui dessine hors de ses bornes (ex. onglet d'une région RDD). Absent = bornes. */
  hitBounds?: (shape: ShapeModel) => Rect;
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
    const pieces = options.edgePieces?.(candidate.element.id);
    const route = options.edgeRoute(candidate.element.id);
    const lines = pieces ?? (route ? [route] : []);
    return lines.some((line) => distanceToPolyline(target, line) <= options.edgeTolerance) ? height : undefined;
  }
  const shape = candidate.element;
  if (options.pickable && !options.pickable(shape)) return undefined;
  const standing = options.standingHit?.(shape);
  if (standing) return standing.at;
  if (shapeContains(shape, target, options.contains, options.hitBounds?.(shape))) return height;
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
  const steps = Math.min(VOLUME_MAX_STEPS, Math.max(1, Math.ceil(distance(a, b) / VOLUME_STEP)));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (shapeContains(shape, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, contains)) {
      return top - (top - base) * t;
    }
  }
  return undefined;
}

/**
 * Point dans la forme : dans ses bornes (ou l'emprise `area` prise au clic), puis selon `contains` (sa définition)
 * s'il est donné.
 */
export function shapeContains(
  shape: ShapeModel,
  p: Point,
  contains?: (shape: ShapeModel, point: Point) => boolean,
  area: Rect = shape.bounds,
): boolean {
  const { x, y, width, height } = area;
  if (p.x < x || p.x > x + width || p.y < y || p.y > y + height) return false;
  return contains ? contains(shape, p) : true;
}

export function distanceToPolyline(p: Point, points: Point[]): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) return distance(p, points[0]!);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, segmentDistance(p, points[i - 1]!, points[i]!));
  return best;
}
