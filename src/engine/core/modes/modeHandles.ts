import type { Point, ShapeModel } from '../../model/types';
import type { ModeHandle } from '../../modes/types';
import type { EngineCore } from '../EngineCore';

/**
 * Poignées propres au mode de la page sur la forme sélectionnée (sujet 250, ex. « + » d'une table RDD) : où elles
 * sont, celle sous le pointeur, le menu de ses choix et le choix fait. Pas d'état : tout se lit de la sélection.
 */
export class ModeHandles {
  constructor(private readonly core: EngineCore) {}

  /** Forme sélectionnée seule et modifiable, et ses poignées de mode (centres en pixels de page). */
  current(): { shape: ShapeModel; handles: Array<ModeHandle & { center: Point }> } | undefined {
    const editable = this.core.targets.editableSelection();
    const page = this.core.pages.getCurrentPage();
    const declared = editable && page && this.core.modes.modeOf(page)?.handles;
    if (!editable || !page || !declared) return undefined;
    const zoom = this.core.camera.state.zoom;
    const handles = declared(page, editable.shape, this.core.selection.current?.part).map((handle) => ({
      ...handle,
      center: { x: handle.at.x + handle.offset.x / zoom, y: handle.at.y + handle.offset.y / zoom },
    }));
    return { shape: editable.shape, handles };
  }

  /** Poignée de mode sous un point écran (tolérance : `edit.handlePickTolerance`). */
  handleAt(screen: Point): { shape: ShapeModel; handle: ModeHandle; at: Point } | undefined {
    const current = this.current();
    if (!current) return undefined;
    const top = this.core.sceneView.elementTop(current.shape.id);
    for (const handle of current.handles) {
      const at = this.core.picking.screenOfPoint(handle.center, top);
      if (Math.hypot(at.x - screen.x, at.y - screen.y) <= this.core.settings.edit.handlePickTolerance)
        return { shape: current.shape, handle, at };
    }
    return undefined;
  }

  /** Clic sur une poignée de mode : l'UI reçoit le menu de ses choix (`modeHandleMenu`) ; vrai si une poignée a été prise. */
  click(screen: Point): boolean {
    const hit = this.handleAt(screen);
    if (!hit) return false;
    const radius = this.core.settings.edit.handleSize * 1.5;
    this.core.events.emit('modeHandleMenu', {
      shapeId: hit.shape.id,
      handleId: hit.handle.id,
      screen: { x: hit.at.x - radius, y: hit.at.y + radius + 2 },
      choices: hit.handle.choices,
    });
    return true;
  }

  /**
   * Choix fait dans le menu : opération du mode (une étape d'annulation, au titre de la poignée), puis la partie
   * qu'elle désigne est sélectionnée et son texte passe en édition s'il en a un.
   */
  choose(shapeId: string, handleId: string, choiceId: string): void {
    const page = this.core.targets.editablePage()?.page;
    const mode = page && this.core.modes.modeOf(page);
    const shape = page?.shapes.find((s) => s.id === shapeId);
    const handle =
      page && shape && mode?.handles?.(page, shape, this.selectedPart(shapeId)).find((h) => h.id === handleId);
    if (!shape || !handle || !mode?.handleChosen) return;
    const chosen = mode.handleChosen;
    const part = this.selectedPart(shapeId);
    let next: string | undefined;
    this.core.pageModes.editPageMode(handle.title, (edit) => {
      next = chosen(edit, shape, handleId, choiceId, part);
    });
    const fresh = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === shapeId);
    if (next === undefined || !fresh) return;
    this.core.selection.selectItems([{ type: 'shape', element: fresh }], next);
    if (this.core.shapeParts.text(shapeId, next)) this.core.labelEditor.editPartLabel(shapeId, next);
  }

  private selectedPart(shapeId: string): string | undefined {
    const selection = this.core.selection.current;
    return selection?.picked.element.id === shapeId ? selection.part : undefined;
  }
}
