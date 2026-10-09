import type { PageTree } from '../format/xmlTree';
import { independentRoots } from '../interaction/selectionRules';
import type { ModeObstacles } from '../modes/types';
import type { PageModel, Point, Rect, ShapeModel } from '../model/types';
import { edgeOf, shapeOf } from '../model/pageIndex';
import type { TerminalEnd } from './edgeEnds';
import { collectMoveSet, isLocked, unionMoveSets } from './moveSet';
import type { MoveSet } from './moveSet';

/** Plan d'un déplacement ou d'un redimensionnement au début du glisser (SPEC §14.1) : ce qui bouge, et ses bornes. */

/** Obstacles du mode de la page pour une forme (sujet 241) ; undefined : aucune borne. */
export type ObstaclesOf = (shape: ShapeModel) => ModeObstacles | undefined;

/**
 * Bornes du mode de la page pour un déplacement (sujet 241) : emprises des formes saisies qui en ont, à leur place
 * d'origine, et obstacles à ne pas approcher.
 */
export interface MoveBounds {
  moving: Rect[];
  obstacles: Rect[];
  gap: number;
}

/** Bornes du mode de la page pour un redimensionnement : obstacles, et ce que la forme dessine au-dessus de ses bornes. */
export interface ResizeBounds {
  obstacles: Rect[];
  above: number;
  gap: number;
}

/** Ce que bouge un déplacement : formes saisies, ce qui les suit, et les bornes du mode. */
export interface MovePlan {
  /** Formes dont la géométrie XML est réécrite (plusieurs en sélection multiple). */
  rootIds: string[];
  set: MoveSet;
  /**
   * Flèches sélectionnées avec les formes (hors groupe déplacé) : elles bougent aussi, et un bout dont la
   * forme ne bouge pas est détaché, comme draw.io (`disconnectOnMove`) ; point libre au début du glisser.
   */
  edges: Array<{ id: string; detach: Array<{ end: TerminalEnd; point?: Point }> }>;
  /** Formes et flèches emportées par le mode de la page (ex. contenu d'une région RDD, sujet 182), hors sélection. */
  carried: Set<string>;
  /** Bornes du mode de la page (sujet 241) ; absent = déplacement libre. */
  bounded?: MoveBounds;
}

/**
 * Plan d'un déplacement : formes saisies (`shapeIds`, déjà déplaçables), `carried` (emportées par le mode), flèches
 * sélectionnées (`edgeIds`) qui suivent, bornes du mode.
 */
export function movePlan(
  page: PageModel,
  pageTree: PageTree,
  shapeIds: string[],
  edgeIds: string[],
  carried: string[],
  obstaclesOf: ObstaclesOf,
): MovePlan {
  const sets = new Map<string, MoveSet>();
  const setOf = (id: string) => {
    if (!sets.has(id)) sets.set(id, collectMoveSet(page, id));
    return sets.get(id)!;
  };
  const rootIds = independentRoots([...shapeIds, ...carried], (id) => setOf(id).shapeIds);
  const set = unionMoveSets(rootIds.map(setOf));
  // Formes emportées : les flèches qui les relient entre elles (ou à la forme saisie) bougent avec elles.
  const carriedEdges =
    carried.length > 0
      ? page.edges
          .filter((edge) => set.shapeIds.has(edge.sourceId ?? '') && set.shapeIds.has(edge.targetId ?? ''))
          .map((edge) => edge.id)
          .filter((id) => !edgeIds.includes(id))
      : [];
  // Flèches de la sélection qui bougent d'elles-mêmes (une flèche d'un groupe déplacé suit déjà).
  const edges: MovePlan['edges'] = [];
  for (const id of [...edgeIds, ...carriedEdges]) {
    const edge = edgeOf(page, id);
    if (!edge || isLocked(edge) || !pageTree.cells.get(edge.id)?.cell || set.edgeIds.has(edge.id)) continue;
    const detach = (['source', 'target'] as const)
      .filter((end) => {
        const terminal = end === 'source' ? edge.sourceId : edge.targetId;
        return terminal !== undefined && !set.shapeIds.has(terminal);
      })
      .map((end) => ({ end }));
    edges.push({ id: edge.id, detach });
    set.edgeIds.add(edge.id);
    set.connectedEdgeIds.delete(edge.id);
  }
  return {
    rootIds,
    set,
    edges,
    carried: new Set([...carried, ...carriedEdges]),
    bounded: moveBounds(
      page,
      rootIds.filter((id) => !carried.includes(id)),
      set.shapeIds,
      obstaclesOf,
    ),
  };
}

/**
 * Bornes d'un déplacement : emprises des formes saisies (`rootIds`) qui ont des obstacles, et ces obstacles, sauf ceux
 * qui bougent aussi (`moving`). Undefined : aucune borne.
 */
export function moveBounds(
  page: PageModel,
  rootIds: string[],
  moving: ReadonlySet<string>,
  obstaclesOf: ObstaclesOf,
): MoveBounds | undefined {
  const extents: Rect[] = [];
  const obstacles: Rect[] = [];
  let gap = 0;
  for (const id of rootIds) {
    const shape = shapeOf(page, id);
    const found = shape && obstaclesOf(shape);
    if (!shape || !found) continue;
    gap = Math.max(gap, found.gap);
    const above = found.above ?? 0;
    extents.push({ ...shape.bounds, y: shape.bounds.y - above, height: shape.bounds.height + above });
    obstacles.push(...found.rects.filter((r) => !moving.has(r.id)).map((r) => r.rect));
  }
  return extents.length > 0 && obstacles.length > 0 ? { moving: extents, obstacles, gap } : undefined;
}

/** Bornes du redimensionnement d'une forme ; undefined : aucune. */
export function resizeBounds(page: PageModel, shapeId: string, obstaclesOf: ObstaclesOf): ResizeBounds | undefined {
  const shape = shapeOf(page, shapeId);
  const found = shape && obstaclesOf(shape);
  if (!found || found.rects.length === 0) return undefined;
  return { obstacles: found.rects.map((r) => r.rect), above: found.above ?? 0, gap: found.gap };
}
