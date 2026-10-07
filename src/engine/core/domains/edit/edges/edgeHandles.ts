import type { TerminalEnd } from '../../../edit/edgeEnds';
import { pointHandles, pointsEditor } from '../../../edit/edgePointEdits';
import type { PointHandle, PointsContext } from '../../../edit/edgePointEdits';
import type { EdgeModel, PageModel, Point } from '../../../model/types';
import { toTerminal } from '../../../render/edges/edge';
import { fixedAnchor, routeEdgePoints, routingCenter } from '../../../render/edges/route';
import type { EngineCore } from '../../EngineCore';
import { shapesById } from '../../../model/pageIndex';

/** Poignées de la flèche sélectionnée : ses bouts, et entre eux ses segments, coudes et points. */
export class EdgeHandles {
  constructor(private readonly core: EngineCore) {}

  /** Bouts du tracé d'une flèche, en coordonnées page (objet éventuellement décalé en cours de glisser). */
  edgeEndPoints(edgeId: string): Record<TerminalEnd, Point> | undefined {
    const object = this.core.sceneView.sceneObject(edgeId);
    const route = object?.userData.route as Point[] | undefined;
    if (!object || !route || route.length < 2) return undefined;
    const at = (p: Point) => ({ x: p.x + object.position.x, y: p.y + object.position.y });
    return { source: at(route[0]!), target: at(route[route.length - 1]!) };
  }

  /** Bout de la flèche sélectionnée sous un point écran (tolérance des poignées). */
  edgeEndAt(screen: Point): TerminalEnd | undefined {
    const edge = this.core.targets.edgeHandlesSelection()?.edge;
    const ends = edge && this.edgeEndPoints(edge.id);
    if (!edge || !ends) return undefined;
    const top = this.core.sceneView.elementTop(edge.id);
    let best: { end: TerminalEnd; distance: number } | undefined;
    for (const end of ['target', 'source'] as const) {
      const at = this.core.picking.screenOfPoint(ends[end], top);
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
      if (distance <= this.core.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { end, distance };
    }
    return best?.end;
  }

  /** Ce que les poignées entre les bouts savent de la flèche (tracé brut affiché, formes, points d'appui). */
  pointsContext(page: PageModel, edge: EdgeModel): PointsContext | undefined {
    const object = this.core.sceneView.sceneObject(edge.id);
    const raw = object?.userData.points as Point[] | undefined;
    if (!object || !raw || raw.length < 2) return undefined;
    const shapes = shapesById(page);
    const source = toTerminal(shapes.get(edge.sourceId ?? ''));
    const target = toTerminal(shapes.get(edge.targetId ?? ''));
    const sourceFixed = source && fixedAnchor(source, edge.style, 'source');
    const targetFixed = target && fixedAnchor(target, edge.style, 'target');
    const { zoom } = this.core.camera.state;
    return {
      editor: pointsEditor(edge.style),
      route: raw.map((p) => ({ x: p.x + object.position.x, y: p.y + object.position.y })),
      waypoints: edge.points.map((p) => ({ ...p })),
      source: source?.bounds,
      target: target?.bounds,
      sourceAnchor: sourceFixed ?? (source && routingCenter(source)),
      targetAnchor: targetFixed ?? (target && routingCenter(target)),
      sourceFixed: !!sourceFixed,
      targetFixed: !!targetFixed,
      reroute: (waypoints) =>
        routeEdgePoints({
          source,
          target,
          sourcePoint: edge.sourcePoint,
          targetPoint: edge.targetPoint,
          waypoints,
          style: edge.style,
        }),
      tolerance: this.core.settings.edit.edgePointAlignTolerance / zoom,
      handleRadius: (this.core.settings.edit.handleSize * 1.5) / zoom,
    };
  }

  /** Poignée entre les bouts de la flèche sélectionnée sous un point écran. */
  pointHandleAt(screen: Point): PointHandle | undefined {
    const editable = this.core.targets.edgeHandlesSelection();
    const context = editable && this.pointsContext(editable.page, editable.edge);
    if (!editable || !context) return undefined;
    const top = this.core.sceneView.elementTop(editable.edge.id);
    let best: { handle: PointHandle; distance: number } | undefined;
    for (const handle of pointHandles(context)) {
      const at = this.core.picking.screenOfPoint(handle.point, top);
      // À distance égale, une vraie poignée passe avant une poignée en transparence.
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y) + (handle.faded ? 0.5 : 0);
      if (distance <= this.core.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { handle, distance };
    }
    return best?.handle;
  }
}
