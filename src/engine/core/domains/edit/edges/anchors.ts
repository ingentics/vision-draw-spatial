import {
  anchorPosition,
  connectableShapes,
  endAttachmentOf,
  frameConstraint,
  nearestFreeAnchor,
  shapeAnchors,
  sideMiddle,
  sideOfConstraint,
} from '../../../edit/edgeEnds';
import type { Anchor, EndAttachment, Side, TerminalEnd } from '../../../edit/edgeEnds';
import { pointsEditor } from '../../../edit/edgePointEdits';
import { squareEnd } from '../../../edit/squareEnd';
import { loopWaypoints } from '../../../edit/loops';
import type { EdgeModel, PageModel, Point, ShapeModel } from '../../../model/types';
import { toTerminal } from '../../../render/edges/terminal';
import { routeEdgePoints } from '../../../render/edges/route';
import type { EndAccepts } from '../../modes/pageModes';
import type { EngineCore } from '../../EngineCore';
import { shapeOf, shapesById } from '../../../model/pageIndex';
import { nearestOnScreen } from '../../selection/picking';
import { snapPoint } from '../../../model/geometry';

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
   * fixe), sinon intérieur d'une forme (attache auto), sinon un point libre au niveau de la flèche. `accepts` : formes
   * permises par le mode de la page (`PageModes.endAccepts`).
   */
  endAttachmentAt(
    page: PageModel,
    screen: Point,
    options: {
      accepts?: EndAccepts;
      skip?: AnchorSkip;
      taken?: TakenAnchor[];
      height: number;
      snap: boolean;
      grid: number;
    },
  ): EndAttachment {
    // Règle du mode au point visé, à la hauteur de chaque forme (sujet 333).
    const { accepts } = options;
    const accepted = accepts
      ? (shape: ShapeModel) =>
          accepts(shape, this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id)))
      : undefined;
    if (this.core.arrangement.distributes(page)) {
      // Ancrage automatique : on ne vise que le côté de la forme (le plus proche du pointeur) ; la répartition suit.
      const shape = this.core.picking.shapeAt(screen, accepted);
      if (shape) {
        const pointer = this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
        const side = sideOfConstraint(frameConstraint(shape.bounds, pointer)) ?? 'n';
        return { kind: 'fixed', shapeId: shape.id, constraint: sideMiddle(side) };
      }
    }
    const shapes = this.core.arrangement.distributes(page)
      ? []
      : connectableShapes(page, this.core.registry).filter((s) => !accepted || accepted(s));
    const candidates = shapes.flatMap((shape) => {
      const top = this.core.sceneView.elementTop(shape.id);
      return this.anchorsOf(page, shape, options.skip, options.taken).map(({ constraint }) => ({
        shape,
        constraint,
        top,
      }));
    });
    const best = nearestOnScreen(
      candidates,
      (c) => this.core.projection.screenOfPoint(anchorPosition(c.shape, c.constraint), c.top),
      screen,
      this.core.settings.edit.handlePickTolerance * 1.5,
    );
    if (best) return { kind: 'fixed', shapeId: best.shape.id, constraint: { ...best.constraint } };
    const shape = this.core.picking.shapeAt(screen, accepted);
    if (shape) return { kind: 'floating', shapeId: shape.id };
    const point = this.core.projection.groundPointAtHeight(screen, options.height);
    return { kind: 'free', point: snapPoint(point, options.snap ? options.grid : 0) };
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
    const shape = attachment?.kind === 'floating' && shapeOf(page, attachment.shapeId);
    const point = shape && this.core.edgeHandles.edgeEndPoints(edge.id)?.[end];
    return shape && point ? { shapeId: shape.id, constraint: frameConstraint(shape.bounds, point) } : undefined;
  }

  /** Point d'ancrage libre d'une forme (sur un côté donné, ou tous) le plus proche d'un point de la page. */
  nearestFreeAnchor(
    page: PageModel,
    shape: ShapeModel,
    toward: Point,
    side?: Side,
    taken: TakenAnchor[] = [],
  ): { constraint: Point; point: Point } | undefined {
    return nearestFreeAnchor(shape, this.anchorsOf(page, shape, undefined, taken), toward, side);
  }

  /** Coudes d'une flèche qui boucle sur sa forme par deux points fixes ; undefined si ce n'en est pas une. */
  loopPoints(page: PageModel, edge: EdgeModel): Point[] | undefined {
    const shape = edge.sourceId === edge.targetId && shapeOf(page, edge.sourceId);
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
    const shapes = shapesById(page);
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
      return side && { point: anchorPosition(shape, c), side };
    };
    const a = end(from);
    const b = end(to);
    return a && b ? loopWaypoints(shape.bounds, a, b, this.core.settings.shapes.edgeLoopMargin) : undefined;
  }
}
