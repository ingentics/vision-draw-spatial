import { canMoveCell, moveCell } from '../../../format/cellEdits';
import { writeDrawio } from '../../../format/write';
import { collectMoveSet, isLocked, moveTarget } from '../../../edit/moveSet';
import { alignDeltas, arrangedMoves, distributeDeltas } from '../../../edit/align';
import type { AlignItem, AlignMove, AlignReference, DistributeMove } from '../../../edit/align';
import type { Point, Rect } from '../../../model/types';
import { reorderCells } from '../../../format/order';
import type { OrderMove } from '../../../format/order';
import type { EngineCore } from '../../EngineCore';

/** Étape d'annulation de chaque changement d'ordre de dessin (ticket 130). */
const ORDER_LABELS: Record<OrderMove, string> = {
  front: 'Premier plan',
  back: 'Arrière-plan',
  forward: 'Avancer',
  backward: 'Reculer',
};

/** Ordre de dessin, alignement et répartition de la sélection (tickets 130, 136). */
export class ArrangeCommands {
  constructor(private readonly core: EngineCore) {}

  orderSelection(move: OrderMove): void {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || !selection || selection.pageId !== editable.page.id || !this.core.file.xmlTree) return;
    const before = writeDrawio(this.core.file.xmlTree);
    const ids = selection.items.map((item) => item.element.id);
    if (!reorderCells(editable.pageTree, ids, move)) return;
    this.core.edits.recordSnapshot(ORDER_LABELS[move], before);
    this.core.file.documentChanged([editable.page.id], { distribute: false });
  }

  alignSelection(move: AlignMove, reference: AlignReference): void {
    this.arrangeSelection('Aligner', (items) => alignDeltas(items, move, reference));
  }

  distributeSelection(move: DistributeMove): void {
    this.arrangeSelection('Répartir', (items) => distributeDeltas(items, move));
  }

  /**
   * Déplace chaque forme de la sélection (celle qui bouge vraiment : son groupe, cf. `moveTarget`) du décalage calculé
   * sur leurs cadres, dans l'ordre de sélection. Une forme contenue dans une autre de la sélection suit celle-ci, qu'elle
   * soit son enfant draw.io ou emportée par le mode de la page (`gestures.carries`, ex. contenu d'une région RDD) ; une forme
   * verrouillée compte (référence, extrême) mais ne bouge pas. Comme au clavier (sujet 289), le décalage d'une forme
   * qui a des obstacles est borné (`clampMove`), les formes qu'elle emporte la suivent, et le mode remet en ordre
   * autour des formes posées (`gestures.placed`), dans la même étape d'annulation.
   */
  private arrangeSelection(label: string, deltasOf: (items: AlignItem[]) => Map<string, Point>): void {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    const { page, pageTree } = editable;
    const modes = this.core.pageModes;
    const shapeOf = (id: string) => page.shapes.find((s) => s.id === id);
    const targets = selection.items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.core.registry));
    const carriedBy = new Map(targets.map((shape) => [shape.id, modes.carried(page, [shape.id], pageTree)]));
    const carried = (id: string) => carriedBy.get(id) ?? [];
    const moves = arrangedMoves(
      targets.map((shape) => ({ id: shape.id, bounds: shape.bounds })),
      deltasOf,
      {
        contentOf: (id) => new Set([id, ...carried(id)].flatMap((root) => [...collectMoveSet(page, root).shapeIds])),
        carried,
        movable: (id) => {
          const shape = shapeOf(id);
          return shape !== undefined && !isLocked(shape) && canMoveCell(pageTree, id);
        },
        bounds: (id) => {
          const shape = shapeOf(id);
          const found = shape && modes.obstacles(page, shape);
          if (!shape || !found) return undefined;
          const above = found.above ?? 0;
          const extent = { ...shape.bounds, y: shape.bounds.y - above, height: shape.bounds.height + above };
          return { extent, obstacles: found.rects, gap: found.gap };
        },
      },
    );
    if (moves.length === 0) return;
    this.core.edits.recordEdit(label);
    // Bornes d'avant des formes déplacées, pour que le mode retrouve la page d'avant (`gestures.placed`).
    const previous = new Map<string, Rect>();
    for (const move of moves) {
      for (const id of [move.id, ...move.carried]) {
        moveCell(pageTree, id, move.delta);
        for (const contentId of collectMoveSet(page, id).shapeIds) {
          const bounds = shapeOf(contentId)?.bounds;
          if (bounds) previous.set(contentId, bounds);
        }
      }
    }
    this.core.modeFollowUps.shapesPlaced(
      page.id,
      moves.map((move) => move.id),
      (shape) => previous.get(shape.id),
    );
    this.core.file.documentChanged([page.id]);
  }
}
