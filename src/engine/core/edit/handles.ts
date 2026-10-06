import { handlePoints, isConnectHandle } from '../../edit/handles';
import type { HandleKind, HandleLayout } from '../../edit/handles';
import type { Point } from '../../model/types';
import type { EngineCore } from '../EngineCore';

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
    if (!editable) return undefined;
    const { shape } = editable;
    const top = this.core.sceneView.elementTop(shape.id);
    const resizable = this.core.registry.isResizable(shape);
    let best: { kind: HandleKind; distance: number } | undefined;
    for (const { kind, point } of handlePoints(shape.bounds, this.core.camera.state.zoom, this.handleLayout())) {
      if (!isConnectHandle(kind) && !resizable) continue;
      const at = this.core.picking.screenOfPoint(point, top);
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
      if (distance <= this.core.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { kind, distance };
    }
    return best?.kind;
  }
}
