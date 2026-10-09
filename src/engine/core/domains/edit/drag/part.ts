import type { PageModel, Point } from '../../../model/types';
import type { PartDrag } from './types';
import type { EngineCore } from '../../EngineCore';
import type { ReadonlyShapeModel } from '../../../model/readonly';
import { shapeOf } from '../../../model/pageIndex';

/**
 * Partie sélectionnée d'une forme glissée à une autre place (sujet 252, ex. champ d'une table RDD) : la place visée
 * est donnée par le mode (`ModeParts.dropAt`), et la forme est redessinée en direct telle qu'elle serait (`preview`),
 * la partie mise en valeur à sa nouvelle place ; le lâcher la déplace.
 */
export class PartDrags {
  /** Aperçu affiché : la forme redessinée et la partie à sa nouvelle place ; absent = forme telle quelle. */
  private shown: { shape: ReadonlyShapeModel; part: string; target: string } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Appui sur la partie sélectionnée d'une forme dont le mode sait la glisser : le glisser de cette partie. */
  grab(page: PageModel, screen: Point): PartDrag | undefined {
    const selection = this.core.selection.current;
    if (selection?.part === undefined || selection.pageId !== page.id || !this.core.shapeParts.canDrag(page))
      return undefined;
    const shape = shapeOf(page, selection.picked.element.id);
    if (!shape || this.core.shapeParts.partAt(page, shape, screen) !== selection.part) return undefined;
    return { kind: 'part', pageId: page.id, shapeId: shape.id, part: selection.part, started: false };
  }

  /** Pointeur suivi : place visée, et la forme redessinée avec la partie à cette place. */
  follow(page: PageModel, drag: PartDrag, screen: Point): void {
    drag.started = true;
    this.core.canvas.style.cursor = 'grabbing';
    const shape = shapeOf(page, drag.shapeId);
    if (!shape) return;
    const point = this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
    drag.target = this.core.shapeParts.dropAt(page, shape, drag.part, point);
    if (drag.target === this.shown?.target) return;
    const preview =
      drag.target === undefined ? undefined : this.core.shapeParts.dragPreview(page, shape, drag.part, drag.target);
    this.shown = preview && drag.target !== undefined ? { ...preview, target: drag.target } : undefined;
    this.core.live.rebuildShapeObject(preview?.shape ?? shape);
    this.core.live.afterLiveEdit();
  }

  /** Partie mise en valeur pendant le glisser : à sa place dans l'aperçu (`ShapeParts.selectedBounds`). */
  previewed(): { shape: ReadonlyShapeModel; part: string } | undefined {
    return this.shown;
  }

  /** Lâcher : la partie est déplacée par le mode (une étape d'annulation), puis sélectionnée à sa nouvelle place. */
  commit(drag: PartDrag): void {
    this.shown = undefined;
    const page = this.core.targets.editablePage()?.page;
    const shape = shapeOf(page, drag.shapeId);
    if (!page || !shape || !this.core.shapeParts.canDrag(page)) return;
    const target = drag.target;
    const { changed, next } =
      target !== undefined
        ? this.core.shapeParts.move('Ordre', shape, drag.part, target)
        : { changed: false, next: undefined };
    // Rien d'écrit (hors de toute place) : la forme reprend son dessin.
    if (!changed) {
      this.core.live.rebuildShapeObject(shape);
      this.core.live.afterLiveEdit();
      return;
    }
    const fresh = shapeOf(this.core.pages.getCurrentPage(), shape.id);
    if (fresh && next !== undefined) this.core.selection.selectItems([{ type: 'shape', element: fresh }], next);
  }

  /** Nouveau document : le glisser en cours est abandonné sans lâcher, plus d'aperçu. */
  resetDocument(): void {
    this.shown = undefined;
  }
}
