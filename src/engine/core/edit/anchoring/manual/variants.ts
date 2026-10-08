import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../../../model/types';
import { toTerminal } from '../../../render/edges/terminal';
import { routeEdge } from '../../../render/edges/route';
import {
  SIDES,
  anchorPosition,
  constraintStyle,
  endAttachmentOf,
  frameConstraint,
  nearestFreeAnchor,
  shapeAnchors,
} from '../../edgeEnds';
import type { Side, TerminalEnd } from '../../edgeEnds';
import { LOOP_MARGIN, loopWaypoints } from '../../loops';
import { center, distance, samePoint } from '../../../model/geometry';
import { edgeOf, shapesById } from '../../../model/pageIndex';

/**
 * Variantes de placement d'une flèche en ancrage manuel (touche F, SPEC §14.1) : pour chaque couple côté de départ ×
 * côté d'arrivée, la flèche part du point d'ancrage libre de ce côté le plus proche de l'autre forme et arrive au point
 * libre le plus proche de son départ ; les variantes sont rangées de la meilleure à la moins bonne (tracé qui ne
 * traverse aucune forme d'abord, puis longueur et coudes).
 */

export interface PlacementVariant {
  /** Points d'attache, relatifs aux cadres des formes (`exitX/exitY`, `entryX/entryY`). */
  exit: Point;
  entry: Point;
  /** Points intermédiaires (coudes d'une boucle ; aucun sinon). */
  points: Point[];
  sides: [Side, Side];
  score: number;
}

/** Poids d'une forme traversée : une variante qui en traverse une passe après toutes les autres. */
const HIT_COST = 100000;
/** Coût d'un coude, en pixels de longueur équivalente. */
const BEND_COST = 30;

/** Vrai si un segment passe par l'intérieur d'un rectangle (approché par son emprise s'il est oblique). */
function enters(a: Point, b: Point, r: Rect): boolean {
  return (
    Math.max(a.x, b.x) > r.x + 1e-6 &&
    Math.min(a.x, b.x) < r.x + r.width - 1e-6 &&
    Math.max(a.y, b.y) > r.y + 1e-6 &&
    Math.min(a.y, b.y) < r.y + r.height - 1e-6
  );
}

/** Variantes de placement d'une flèche reliée à deux formes, de la meilleure à la moins bonne. */
export function placementVariants(page: PageModel, edgeId: string, loopMargin = LOOP_MARGIN): PlacementVariant[] {
  const edge = edgeOf(page, edgeId);
  const shapes = shapesById(page);
  const source = edge && shapes.get(edge.sourceId ?? '');
  const target = edge && shapes.get(edge.targetId ?? '');
  if (!edge || !source || !target) return [];
  const loop = source.id === target.id;
  const others = page.edges.filter((e) => e.id !== edge.id);
  const routeOf = (e: EdgeModel, style: Record<string, string>, waypoints: Point[]) =>
    routeEdge({
      source: toTerminal(shapes.get(e.sourceId ?? '')),
      target: toTerminal(shapes.get(e.targetId ?? '')),
      sourcePoint: e.sourcePoint,
      targetPoint: e.targetPoint,
      waypoints,
      style,
    });
  // Bouts en attache auto des autres flèches : point touché par leur tracé (calculé une fois).
  const touched = new Map<string, Point | undefined>();
  const floatingAt = (e: EdgeModel, end: TerminalEnd) => {
    const key = `${e.id}:${end}`;
    if (!touched.has(key)) {
      const route = routeOf(e, e.style, e.points);
      const point = end === 'source' ? route[0] : route[route.length - 1];
      const attachment = endAttachmentOf(e, end);
      const shape = attachment && attachment.kind !== 'free' ? shapes.get(attachment.shapeId) : undefined;
      touched.set(key, point && shape ? frameConstraint(shape.bounds, point) : undefined);
    }
    return touched.get(key);
  };
  const nearestFree = (shape: ShapeModel, side: Side, toward: Point, extra: Point[] = []) =>
    nearestFreeAnchor(shape, shapeAnchors(shape.id, others, { floatingAt, extra }), toward, side);

  const variants: PlacementVariant[] = [];
  for (const s of SIDES) {
    const exit = nearestFree(source, s, loop ? anchorPosition(source, { x: 0.5, y: 0.5 }) : center(target.bounds));
    if (!exit) continue;
    for (const t of SIDES) {
      const entry = nearestFree(target, t, exit.point, loop ? [exit.constraint] : []);
      if (!entry || (loop && samePoint(entry.constraint, exit.constraint))) continue;
      const points = loop
        ? loopWaypoints(source.bounds, { point: exit.point, side: s }, { point: entry.point, side: t }, loopMargin)
        : [];
      const style = { ...edge.style };
      for (const [key, value] of Object.entries({
        ...constraintStyle('source', exit.constraint),
        ...constraintStyle('target', entry.constraint),
      })) {
        if (value === undefined) delete style[key];
        else style[key] = value;
      }
      const route = routeOf(edge, style, points);
      let length = 0;
      let hits = 0;
      for (let i = 0; i + 1 < route.length; i++) {
        const [a, b] = [route[i]!, route[i + 1]!];
        length += distance(a, b);
        const first = i === 0;
        const last = i + 2 === route.length;
        for (const shape of page.shapes) {
          // Le premier et le dernier segments partent de leurs formes : ils ne comptent pas comme les traversant.
          if ((first && shape.id === source.id) || (last && shape.id === target.id)) continue;
          if (enters(a, b, shape.bounds)) hits++;
        }
      }
      const score = hits * HIT_COST + length + BEND_COST * Math.max(0, route.length - 2);
      variants.push({ exit: exit.constraint, entry: entry.constraint, points, sides: [s, t], score });
    }
  }
  return variants.sort((a, b) => a.score - b.score);
}

/**
 * Variante qui suit le placement actuel de la flèche (en boucle) : la suivante dans le classement si le placement
 * actuel y figure, sinon la meilleure. Undefined s'il n'y a pas d'autre placement.
 */
export function nextPlacementVariant(
  page: PageModel,
  edgeId: string,
  loopMargin = LOOP_MARGIN,
): PlacementVariant | undefined {
  const edge = edgeOf(page, edgeId);
  const variants = placementVariants(page, edgeId, loopMargin);
  if (!edge || variants.length === 0) return undefined;
  const exit = endAttachmentOf(edge, 'source');
  const entry = endAttachmentOf(edge, 'target');
  const current =
    exit?.kind === 'fixed' && entry?.kind === 'fixed'
      ? variants.findIndex((v) => samePoint(v.exit, exit.constraint) && samePoint(v.entry, entry.constraint))
      : -1;
  const next = variants[(current + 1) % variants.length]!;
  return current >= 0 && variants.length === 1 ? undefined : next;
}
