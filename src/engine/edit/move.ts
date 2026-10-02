import { computeBounds } from '../model/bounds';
import type { PageModel, Point, Rect, ShapeModel } from '../model/types';

/**
 * Déplacement de formes dans le modèle neutre (SPEC §14.1). Les coordonnées du modèle sont
 * absolues : une forme entraîne ses descendants et les arêtes qu'ils contiennent. Les arêtes
 * simplement reliées ne bougent pas (leur tracé suit leurs extrémités au rendu, comme dans draw.io).
 */

export interface MoveSet {
  /** Forme saisie (dont la géométrie XML est réécrite). */
  rootId: string;
  /** Formes qui bougent : la forme saisie et ses descendants. */
  shapeIds: Set<string>;
  /** Arêtes contenues dans ces formes (points intermédiaires et extrémités libres déplacés). */
  edgeIds: Set<string>;
  /** Arêtes reliées à une forme qui bouge sans être déplacées elles-mêmes (tracé à recalculer). */
  connectedEdgeIds: Set<string>;
}

/**
 * Forme réellement déplacée quand on saisit `shape` : comme dans draw.io, le groupe le plus
 * externe qui la contient (un groupe se déplace d'un bloc), sinon la forme elle-même.
 */
export function moveTarget(page: PageModel, shape: ShapeModel): ShapeModel {
  const byId = new Map(page.shapes.map((s) => [s.id, s]));
  let target = shape;
  const seen = new Set<string>();
  for (let parent = byId.get(shape.parentId ?? ''); parent && !seen.has(parent.id);) {
    seen.add(parent.id);
    if (parent.kind === 'group') target = parent;
    parent = byId.get(parent.parentId ?? '');
  }
  return target;
}

/** Style draw.io interdisant le déplacement (`movable=0`, `locked=1`). */
export function isLocked(shape: ShapeModel): boolean {
  return shape.style.movable === '0' || shape.style.locked === '1';
}

export function collectMoveSet(page: PageModel, rootId: string): MoveSet {
  const children = new Map<string, string[]>();
  for (const shape of page.shapes) {
    if (!shape.parentId) continue;
    const list = children.get(shape.parentId) ?? [];
    list.push(shape.id);
    children.set(shape.parentId, list);
  }
  const shapeIds = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (shapeIds.has(id)) continue;
    shapeIds.add(id);
    stack.push(...(children.get(id) ?? []));
  }

  const edgeIds = new Set<string>();
  const connectedEdgeIds = new Set<string>();
  for (const edge of page.edges) {
    if (edge.parentId && shapeIds.has(edge.parentId)) edgeIds.add(edge.id);
    else if (shapeIds.has(edge.sourceId ?? '') || shapeIds.has(edge.targetId ?? '')) connectedEdgeIds.add(edge.id);
  }
  return { rootId, shapeIds, edgeIds, connectedEdgeIds };
}

/** Applique un déplacement au modèle (en place) et recalcule l'emprise de la page. */
export function translateMoveSet(page: PageModel, set: MoveSet, delta: Point): void {
  if (delta.x === 0 && delta.y === 0) return;
  const shift = (p: Point): Point => ({ x: p.x + delta.x, y: p.y + delta.y });
  for (const shape of page.shapes) {
    if (set.shapeIds.has(shape.id)) shape.bounds = shiftRect(shape.bounds, delta);
  }
  for (const edge of page.edges) {
    if (!set.edgeIds.has(edge.id)) continue;
    edge.points = edge.points.map(shift);
    if (edge.sourcePoint) edge.sourcePoint = shift(edge.sourcePoint);
    if (edge.targetPoint) edge.targetPoint = shift(edge.targetPoint);
  }
  page.bounds = computeBounds(page.shapes, page.edges);
}

/**
 * Déplacement aimanté à la grille (comme draw.io) : le coin haut-gauche de la forme tombe sur
 * la grille. Sans grille (`gridSize` ≤ 0), le déplacement est arrondi au pixel.
 */
export function snapDelta(bounds: Rect, raw: Point, gridSize: number): Point {
  const step = gridSize > 0 ? gridSize : 1;
  const snap = (origin: number, d: number) => Math.round((origin + d) / step) * step - origin;
  return { x: snap(bounds.x, raw.x), y: snap(bounds.y, raw.y) };
}

function shiftRect(rect: Rect, delta: Point): Rect {
  return { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
}
