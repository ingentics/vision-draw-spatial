import { canMoveCell, moveCell } from '../../../format/edit';
import { writeDrawio } from '../../../format/write';
import { collectMoveSet, isLocked, moveTarget } from '../../../edit/move';
import { alignDeltas, distributeDeltas } from '../../../edit/align';
import type { AlignItem, AlignMove, AlignReference, DistributeMove } from '../../../edit/align';
import { independentRoots } from '../../../interaction/selection';
import type { Point } from '../../../model/types';
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
   * sur leurs cadres, dans l'ordre de sélection. Une forme contenue dans une autre de la sélection suit celle-ci ; une
   * forme verrouillée compte (référence, extrême) mais ne bouge pas.
   */
  private arrangeSelection(label: string, deltasOf: (items: AlignItem[]) => Map<string, Point>): void {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    const { page, pageTree } = editable;
    const targets = selection.items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.core.registry));
    const roots = independentRoots(
      targets.map((shape) => shape.id),
      (id) => collectMoveSet(page, id).shapeIds,
    );
    const items = roots.flatMap((id) => {
      const shape = page.shapes.find((s) => s.id === id);
      return shape ? [{ id, bounds: shape.bounds }] : [];
    });
    const moves = [...deltasOf(items)].filter(([id]) => {
      const shape = page.shapes.find((s) => s.id === id);
      return shape !== undefined && !isLocked(shape) && canMoveCell(pageTree, id);
    });
    if (moves.length === 0) return;
    this.core.edits.recordEdit(label);
    for (const [id, delta] of moves) moveCell(pageTree, id, delta);
    this.core.file.documentChanged([page.id]);
  }
}
