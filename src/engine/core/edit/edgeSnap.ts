import { overlapLength, rectSpan } from '../model/geometry';
import { shapeOf } from '../model/pageIndex';
import type { PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { Side } from './edgeEnds';

/**
 * Aimantation bord à bord déclarée par un mode (sujet 477) : pendant un déplacement ou un redimensionnement, un bord
 * de la forme à moins de `threshold` (pixels de page) d'un bord opposé d'une cible, qu'elle recouvre sur l'autre axe,
 * s'y colle exactement (écart 0). Seuls les bords qui se font face comptent : la forme vient contre la cible, pas
 * alignée sur elle.
 */

/** Distance d'aimantation, en pixels écran. */
export const EDGE_SNAP_PIXELS = 8;

/** Aimantation d'un glisser : emprises des formes saisies à leur place d'origine, et cibles (hors formes déplacées). */
export interface EdgeSnapping {
  moving: Rect[];
  targets: Rect[];
}

/**
 * Aimantation des formes `shapeIds` : leurs emprises, et les cibles que le mode donne pour chacune (`targetsOf`), hors
 * formes déplacées (`moving`) ; undefined sans cible.
 */
export function edgeSnapping(
  page: PageModel,
  shapeIds: readonly string[],
  moving: ReadonlySet<string>,
  targetsOf: (shape: ShapeModel) => ReadonlyArray<{ id: string; rect: Rect }>,
): EdgeSnapping | undefined {
  const rects: Rect[] = [];
  const targets = new Map<string, Rect>();
  for (const id of shapeIds) {
    const shape = shapeOf(page, id);
    const list = shape ? targetsOf(shape) : [];
    if (!shape || list.length === 0) continue;
    rects.push({ ...shape.bounds });
    for (const target of list) if (!moving.has(target.id)) targets.set(target.id, { ...target.rect });
  }
  return rects.length > 0 && targets.size > 0 ? { moving: rects, targets: [...targets.values()] } : undefined;
}

/**
 * Plus petit décalage sur `axis` qui colle le bord `edge` (début ou fin de `rect` sur l'axe) au bord opposé d'une
 * cible, à moins de `threshold` ; undefined s'il n'y en a pas.
 */
function edgeSnap(
  rect: Rect,
  axis: 'x' | 'y',
  edge: 'start' | 'end',
  targets: readonly Rect[],
  threshold: number,
): number | undefined {
  const cross = axis === 'x' ? 'y' : 'x';
  const [lo, hi] = rectSpan(rect, axis);
  let best: number | undefined;
  for (const target of targets) {
    if (overlapLength(...rectSpan(rect, cross), ...rectSpan(target, cross)) <= 0) continue;
    const [tlo, thi] = rectSpan(target, axis);
    // Début de la forme contre la fin de la cible (à sa droite, dessous), ou fin de la forme contre son début.
    const offset = edge === 'start' ? thi - lo : tlo - hi;
    if (Math.abs(offset) <= threshold && (best === undefined || Math.abs(offset) < Math.abs(best))) best = offset;
  }
  return best;
}

/** Le plus petit des deux décalages, en valeur absolue. */
const nearest = (a: number | undefined, b: number | undefined) =>
  a === undefined ? b : b === undefined || Math.abs(a) <= Math.abs(b) ? a : b;

/**
 * Déplacement : décalage à ajouter, par axe, pour coller une des formes `moving` (à leur place courante) à une cible ;
 * 0 sur un axe sans bord assez proche.
 */
export function snapMove(moving: readonly Rect[], targets: readonly Rect[], threshold: number): Point {
  const offset = { x: 0, y: 0 };
  for (const axis of ['x', 'y'] as const) {
    let best: number | undefined;
    for (const rect of moving)
      for (const edge of ['start', 'end'] as const)
        best = nearest(best, edgeSnap(rect, axis, edge, targets, threshold));
    offset[axis] = best ?? 0;
  }
  return offset;
}

/**
 * Redimensionnement : bornes `rect` dont les côtés `sides` (ceux que tire la poignée) sont collés aux cibles proches,
 * sans descendre sous `minSize`.
 */
export function snapResize(
  rect: Rect,
  sides: readonly Side[],
  targets: readonly Rect[],
  threshold: number,
  minSize: number,
): Rect {
  let { x, y, width, height } = rect;
  for (const side of sides) {
    const axis = side === 'w' || side === 'e' ? 'x' : 'y';
    const start = side === 'w' || side === 'n';
    const offset = edgeSnap(rect, axis, start ? 'start' : 'end', targets, threshold);
    if (offset === undefined) continue;
    const size = (axis === 'x' ? width : height) + (start ? -offset : offset);
    if (size < minSize) continue;
    if (axis === 'x') {
      if (start) x += offset;
      width = size;
    } else {
      if (start) y += offset;
      height = size;
    }
  }
  return { x, y, width, height };
}
