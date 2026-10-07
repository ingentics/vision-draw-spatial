import type { PageModel, Point, ShapeModel } from '../../../model/types';
import type { PartDrag } from './types';
import type { EngineCore } from '../../EngineCore';

/**
 * Partie sélectionnée d'une forme glissée à une autre place (sujet 252, ex. champ d'une table RDD) : la place visée
 * est donnée par le mode (`ModeParts.dropAt`), et la forme est redessinée en direct telle qu'elle serait (`preview`),
 * la partie mise en valeur à sa nouvelle place ; le lâcher la déplace.
 */
export class PartDrags {
  /** Aperçu affiché : la forme redessinée et la partie à sa nouvelle place ; absent = forme telle quelle. */
  private shown: { shape: ShapeModel; part: string; target: string } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Appui sur la partie sélectionnée d'une forme dont le mode sait la glisser : le glisser de cette partie. */
  grab(page: PageModel, screen: Point): PartDrag | undefined {
    const selection = this.core.selection.current;
    const parts = this.core.modes.modeOf(page)?.parts;
    if (selection?.part === undefined || selection.pageId !== page.id || !parts?.dropAt || !parts.move)
      return undefined;
    const shape = page.shapes.find((s) => s.id === selection.picked.element.id);
    if (!shape || this.core.shapeParts.partAt(page, shape, screen) !== selection.part) return undefined;
    return { kind: 'part', pageId: page.id, shapeId: shape.id, part: selection.part, started: false };
  }

  /** Pointeur suivi : place visée, et la forme redessinée avec la partie à cette place. */
  follow(page: PageModel, drag: PartDrag, screen: Point): void {
    drag.started = true;
    this.core.canvas.style.cursor = 'grabbing';
    const shape = page.shapes.find((s) => s.id === drag.shapeId);
    const parts = this.core.modes.modeOf(page)?.parts;
    if (!shape || !parts?.dropAt) return;
    const point = this.core.picking.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
    drag.target = parts.dropAt(page, shape, drag.part, point);
    if (drag.target === this.shown?.target) return;
    const preview = drag.target === undefined ? undefined : parts.preview?.(shape, drag.part, drag.target);
    this.shown = preview && drag.target !== undefined ? { ...preview, target: drag.target } : undefined;
    this.core.live.rebuildShapeObject(preview?.shape ?? shape);
    this.core.live.afterLiveEdit();
  }

  /** Partie mise en valeur pendant le glisser : à sa place dans l'aperçu (`ShapeParts.selectedBounds`). */
  previewed(): { shape: ShapeModel; part: string } | undefined {
    return this.shown;
  }

  /** Lâcher : la partie est déplacée par le mode (une étape d'annulation), puis sélectionnée à sa nouvelle place. */
  commit(drag: PartDrag): void {
    this.shown = undefined;
    const page = this.core.targets.editablePage()?.page;
    const shape = page?.shapes.find((s) => s.id === drag.shapeId);
    const move = page && this.core.modes.modeOf(page)?.parts?.move;
    if (!shape || !move) return;
    const target = drag.target;
    let next: string | undefined;
    const changed =
      target !== undefined &&
      this.core.pageModes.editPageMode('Ordre', (edit) => {
        next = move(edit, shape, drag.part, target);
      });
    // Rien d'écrit (hors de toute place) : la forme reprend son dessin.
    if (!changed) {
      this.core.live.rebuildShapeObject(shape);
      this.core.live.afterLiveEdit();
      return;
    }
    const fresh = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === shape.id);
    if (fresh && next !== undefined) this.core.selection.selectItems([{ type: 'shape', element: fresh }], next);
  }

  /** Glisser abandonné sans lâcher (nouveau document) : plus d'aperçu. */
  clear(): void {
    this.shown = undefined;
  }
}
