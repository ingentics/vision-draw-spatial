import { connectSideOf, handlePoints, isConnectHandle } from '../../edit/handleKinds';
import type { HandleKind, HandleLayout } from '../../edit/handleKinds';
import type { Point } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import { nearestOnScreen } from '../selection/picking';

/** Poignées de la forme sélectionnée (redimensionner, connecter) : disposition et poignée sous le pointeur. */
export class ShapeHandles {
  constructor(private readonly core: EngineCore) {}

  /** Disposition des poignées de la sélection (paramètres d'édition). */
  handleLayout(): HandleLayout {
    const { connectHandleOffset, middleHandleMinSpan } = this.core.settings.edit;
    return { connectOffset: connectHandleOffset, middleMinSpan: middleHandleMinSpan };
  }

  /** Poignée de la sélection sous un point écran (tolérance : `edit.handlePickTolerance`). */
  handleAt(screen: Point): HandleKind | undefined {
    const editable = this.core.targets.editableSelection();
    // Silhouette debout (Actor en iso / 3D) : pas de poignées.
    if (!editable || this.core.sceneView.standingHead(editable.shape.id)) return undefined;
    const { shape } = editable;
    const top = this.core.sceneView.elementTop(shape.id);
    const resizable = this.core.registry.isResizable(shape);
    const sides = this.core.registry.connectSides(shape);
    const moved = this.core.registry.movedHandles(shape);
    const handles = handlePoints(shape.bounds, this.core.camera.state.zoom, this.handleLayout(), moved).filter(
      ({ kind }) => (isConnectHandle(kind) ? sides.includes(connectSideOf(kind)) : resizable),
    );
    return nearestOnScreen(
      handles,
      (h) => this.core.picking.screenOfPoint(h.point, top),
      screen,
      this.core.settings.edit.handlePickTolerance,
    )?.kind;
  }
}
