import type { Point, ShapeModel } from '../../model/types';
import { callMode } from '../../modes/modeCalls';
import type { ModeHandle } from '../../modes/types';
import type { EngineCore } from '../EngineCore';

/**
 * Poignées propres au mode de la page sur la forme sélectionnée (sujet 250, ex. « + » d'une table RDD) : où elles
 * sont, celle sous le pointeur, et son clic (sujet 256). Pas d'état : tout se lit de la sélection.
 */
export class ModeHandles {
  constructor(private readonly core: EngineCore) {}

  /** Forme sélectionnée seule et modifiable, et ses poignées de mode (centres en pixels de page). */
  current(): { shape: ShapeModel; handles: Array<ModeHandle & { center: Point }> } | undefined {
    const editable = this.core.targets.editableSelection();
    const page = this.core.pages.getCurrentPage();
    const mode = page && this.core.modes.modeOf(page);
    const declared = mode?.gestures?.handles?.list;
    if (!editable || !page || !mode || !declared) return undefined;
    const zoom = this.core.camera.state.zoom;
    const part = this.core.selection.current?.part;
    const found = this.core.pageModes.call(mode, 'gestures.handles.list', [], declared, page, editable.shape, part);
    const handles = found.map((handle) => ({
      ...handle,
      center: { x: handle.at.x + handle.offset.x / zoom, y: handle.at.y + handle.offset.y / zoom },
    }));
    return { shape: editable.shape, handles };
  }

  /** Poignée de mode sous un point écran (tolérance : `edit.handlePickTolerance`). */
  handleAt(screen: Point): { shape: ShapeModel; handle: ModeHandle } | undefined {
    const current = this.current();
    if (!current) return undefined;
    const top = this.core.sceneView.elementTop(current.shape.id);
    for (const handle of current.handles) {
      const at = this.core.picking.screenOfPoint(handle.center, top);
      if (Math.hypot(at.x - screen.x, at.y - screen.y) <= this.core.settings.edit.handlePickTolerance)
        return { shape: current.shape, handle };
    }
    return undefined;
  }

  /**
   * Clic sur une poignée de mode (sujet 256) : opération du mode (une étape d'annulation, au titre de la poignée), puis
   * la partie qu'elle désigne est sélectionnée et son texte passe en édition s'il en a un. Vrai si une poignée a été
   * prise.
   */
  click(screen: Point): boolean {
    const hit = this.handleAt(screen);
    const page = this.core.targets.editablePage()?.page;
    const clicked = page && this.core.modes.modeOf(page)?.gestures?.handles?.clicked;
    if (!hit) return false;
    if (!clicked) return true;
    const { shape, handle } = hit;
    const part = this.selectedPart(shape.id);
    let next: string | undefined;
    this.core.pageModes.editPageMode(handle.title, (edit) => {
      next = callMode(clicked, edit, shape, handle.id, part);
    });
    this.core.pageModes.selectPart(shape.id, next);
    return true;
  }

  private selectedPart(shapeId: string): string | undefined {
    const selection = this.core.selection.current;
    return selection?.picked.element.id === shapeId ? selection.part : undefined;
  }
}
