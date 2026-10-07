import {
  connectableShapes,
  endAttachmentOf,
  frameConstraint,
  shapeAnchors,
  sideOfConstraint,
} from '../../../edit/edgeEnds';
import type { Anchor, EndAttachment, TerminalEnd } from '../../../edit/edgeEnds';
import { pointsEditor } from '../../../edit/edgePointEdits';
import { squareEnd } from '../../../edit/squareEnd';
import type { ConnectSide } from '../../../edit/handleKinds';
import { sideMiddle } from '../../../edit/anchoring/auto/distribute';
import { loopWaypoints } from '../../../edit/loops';
import type { EdgeModel, PageModel, Point, ShapeModel } from '../../../model/types';
import { toTerminal } from '../../../render/edges/edge';
import { fixedAnchor, routeEdgePoints } from '../../../render/edges/route';
import type { EngineCore } from '../../EngineCore';

/** Point d'ancrage compté comme pris en plus des flèches existantes (ex. départ d'une boucle en cours). */
export type TakenAnchor = { shapeId: string; constraint: Point };

/** Bout de flèche en cours de déplacement : il ne prend pas de point d'ancrage. */
export type AnchorSkip = {
  edgeId: string;
  end: 'source' | 'target';
  /** Où ce bout était attaché au début du glisser : ce point reste pris. */
  origin?: { shapeId: string; constraint: Point };
};

/** Points d'ancrage des formes et accroche des bouts de flèche (comme draw.io), boucles d'une flèche sur sa forme. */
export class Anchors {
  constructor(private readonly core: EngineCore) {}

  /**
   * Accroche d'un bout de flèche sous le pointeur, comme draw.io : point de connexion proche (attache
   * fixe), sinon intérieur d'une forme (attache auto), sinon un point libre au niveau de la flèche.
   */
  endAttachmentAt(
    page: PageModel,
    screen: Point,
    options: {
      exclude?: string;
      skip?: AnchorSkip;
      taken?: TakenAnchor[];
      height: number;
      snap: boolean;
      grid: number;
    },
  ): EndAttachment {
    if (this.core.arrangement.distributes(page)) {
      // Ancrage automatique : on ne vise que le côté de la forme (le plus proche du pointeur) ; la répartition suit.
      const shape = this.core.picking.shapeAt(screen, options.exclude);
      if (shape) {
        const pointer = this.core.picking.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
        const side = sideOfConstraint(frameConstraint(shape.bounds, pointer)) ?? 'n';
        return { kind: 'fixed', shapeId: shape.id, constraint: sideMiddle(side) };
      }
    }
    const shapes = this.core.arrangement.distributes(page)
      ? []
      : connectableShapes(page, this.core.registry).filter((s) => s.id !== options.exclude);
    let best: { shapeId: string; constraint: Point; distance: number } | undefined;
    for (const shape of shapes) {
      const top = this.core.sceneView.elementTop(shape.id);
      for (const { constraint } of this.anchorsOf(page, shape, options.skip, options.taken)) {
        const at = this.core.picking.screenOfPoint(this.anchorPosition(shape, constraint), top);
        const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
        if (distance <= this.core.settings.edit.handlePickTolerance * 1.5 && (!best || distance < best.distance))
          best = { shapeId: shape.id, constraint, distance };
      }
    }
    if (best) return { kind: 'fixed', shapeId: best.shapeId, constraint: { ...best.constraint } };
    const shape = this.core.picking.shapeAt(screen, options.exclude);
    if (shape) return { kind: 'floating', shapeId: shape.id };
    const point = this.core.picking.groundPointAtHeight(screen, options.height);
    const step = options.snap && options.grid > 0 ? options.grid : 1;
    return { kind: 'free', point: { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step } };
  }

  /**
   * Points d'ancrage d'une forme (mode manuel) : les bouts en attache auto comptent au point où leur tracé touche la
   * forme ; le bout en cours de déplacement compte à sa place d'origine.
   */
  anchorsOf(page: PageModel, shape: ShapeModel, skip?: AnchorSkip, taken: TakenAnchor[] = []): Anchor[] {
    return shapeAnchors(shape.id, page.edges, {
      skip,
      extra: [...(skip?.origin ? [skip.origin] : []), ...taken]
        .filter((a) => a.shapeId === shape.id)
        .map((a) => a.constraint),
      floatingAt: (edge, end) => {
        const point = this.core.edgeHandles.edgeEndPoints(edge.id)?.[end];
        return point && frameConstraint(shape.bounds, point);
      },
    });
  }

  /** Point d'ancrage occupé par un bout de flèche attaché à une forme (fixe, ou touché par l'attache auto). */
  endAnchor(page: PageModel, edge: EdgeModel, end: TerminalEnd): { shapeId: string; constraint: Point } | undefined {
    const attachment = endAttachmentOf(edge, end);
    if (attachment?.kind === 'fixed') return { shapeId: attachment.shapeId, constraint: attachment.constraint };
    const shape = attachment?.kind === 'floating' && page.shapes.find((s) => s.id === attachment.shapeId);
    const point = shape && this.core.edgeHandles.edgeEndPoints(edge.id)?.[end];
    return shape && point ? { shapeId: shape.id, constraint: frameConstraint(shape.bounds, point) } : undefined;
  }

  /** Point d'ancrage libre d'une forme (sur un côté donné, ou tous) le plus proche d'un point de la page. */
  nearestFreeAnchor(
    page: PageModel,
    shape: ShapeModel,
    toward: Point,
    side?: ConnectSide,
    taken: TakenAnchor[] = [],
  ): { constraint: Point; point: Point } | undefined {
    let best: { constraint: Point; point: Point; distance: number } | undefined;
    for (const anchor of this.anchorsOf(page, shape, undefined, taken)) {
      if (anchor.used || !anchor.side || (side && anchor.side !== side)) continue;
      const point = this.anchorPosition(shape, anchor.constraint);
      const distance = Math.hypot(point.x - toward.x, point.y - toward.y);
      if (!best || distance < best.distance) best = { constraint: anchor.constraint, point, distance };
    }
    return best && { constraint: best.constraint, point: best.point };
  }

  /** Coudes d'une flèche qui boucle sur sa forme par deux points fixes ; undefined si ce n'en est pas une. */
  loopPoints(page: PageModel, edge: EdgeModel): Point[] | undefined {
    const shape = edge.sourceId === edge.targetId && page.shapes.find((s) => s.id === edge.sourceId);
    const from = endAttachmentOf(edge, 'source');
    const to = endAttachmentOf(edge, 'target');
    if (!shape || from?.kind !== 'fixed' || to?.kind !== 'fixed') return undefined;
    return this.loopBetween(shape, from.constraint, to.constraint);
  }

  /**
   * Ancrage manuel : bout d'une flèche orthogonale à coudes posé sur un point d'ancrage ; si le tracé longe le côté,
   * coudes qui le font arriver à angle droit (`squareEnd`), sinon undefined.
   */
  squaredEndPoints(page: PageModel, edge: EdgeModel, end: TerminalEnd, attachment: EndAttachment): Point[] | undefined {
    if (this.core.arrangement.anchoringOf(page) !== 'manual' || attachment.kind !== 'fixed') return undefined;
    if (edge.points.length === 0 || edge.sourceId === edge.targetId || pointsEditor(edge.style) !== 'segments')
      return undefined;
    const side = sideOfConstraint(attachment.constraint);
    if (!side) return undefined;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const source = toTerminal(shapes.get(edge.sourceId ?? ''));
    const target = toTerminal(shapes.get(edge.targetId ?? ''));
    const reroute = (waypoints: Point[]) =>
      routeEdgePoints({
        source,
        target,
        sourcePoint: edge.sourcePoint,
        targetPoint: edge.targetPoint,
        waypoints,
        style: edge.style,
      });
    return squareEnd(reroute(edge.points), end, side, reroute);
  }

  /** Coudes d'une boucle entre deux points d'ancrage d'une forme (hors de la forme, `loopWaypoints`). */
  loopBetween(shape: ShapeModel, from: Point, to: Point): Point[] | undefined {
    const end = (c: Point) => {
      const side = sideOfConstraint(c);
      return side && { point: this.anchorPosition(shape, c), side };
    };
    const a = end(from);
    const b = end(to);
    return a && b ? loopWaypoints(shape.bounds, a, b, this.core.settings.shapes.edgeLoopMargin) : undefined;
  }

  /** Position d'un point d'ancrage sur la page, projeté sur le contour de la forme comme le tracé. */
  anchorPosition(shape: ShapeModel, constraint: Point): Point {
    const terminal = toTerminal(shape);
    const style = { exitX: String(constraint.x), exitY: String(constraint.y) };
    return (
      (terminal && fixedAnchor(terminal, style, 'source')) ?? {
        x: shape.bounds.x + constraint.x * shape.bounds.width,
        y: shape.bounds.y + constraint.y * shape.bounds.height,
      }
    );
  }
}
