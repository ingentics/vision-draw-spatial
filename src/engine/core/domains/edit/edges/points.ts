import { setCellStyleValue, setEdgePoints } from '../../../format/cellEdits';
import type { PageTree } from '../../../format/xmlTree';
import { removePoint } from '../../../edit/edgePointEdits';
import type { EdgeModel, PageModel, Point } from '../../../model/types';
import type { EngineCore } from '../../EngineCore';
import { edgeOf, shapeOf } from '../../../model/pageIndex';

/** Points intermédiaires d'une flèche : écriture, retour au tracé automatique, retrait ou bascule au double-clic. */
export class EdgePoints {
  constructor(private readonly core: EngineCore) {}

  /** Écrit les points intermédiaires d'une flèche (repère de son parent, comme draw.io). */
  writeEdgePoints(page: PageModel, pageTree: PageTree, edge: EdgeModel, points: Point[]): void {
    const origin = shapeOf(page, edge.parentId)?.bounds ?? { x: 0, y: 0 };
    setEdgePoints(
      pageTree,
      edge.id,
      points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
    );
  }

  resetEdgeRoute(edgeId: string): void {
    const editable = this.core.targets.editablePage();
    const edge = edgeOf(editable?.page, edgeId);
    if (!editable || !edge) return;
    const keys = ['exit', 'entry'].flatMap((prefix) =>
      ['X', 'Y', 'Dx', 'Dy', 'Perimeter'].map((suffix) => `${prefix}${suffix}`),
    );
    const constrained = keys.some((key) => edge.style[key] !== undefined);
    if (edge.points.length === 0 && !constrained) return;
    this.core.edits.recordEdit('Tracé automatique');
    setEdgePoints(editable.pageTree, edge.id, []);
    for (const key of keys) setCellStyleValue(editable.pageTree, edge.id, key, undefined);
    this.core.file.documentChanged([editable.page.id]);
  }

  /**
   * Double-clic sur une poignée de la flèche sélectionnée, comme draw.io : un point intermédiaire est
   * retiré ; le coude d'une flèche en coude bascule entre horizontal et vertical.
   */
  doubleClickPointHandle(screen: Point): boolean {
    const handle = this.core.edgeHandles.pointHandleAt(screen);
    const editable = handle && this.core.targets.editableEdgeSelection();
    if (!handle || !editable) return false;
    const { page, pageTree, edge } = editable;
    if (handle.kind === 'point') {
      this.core.edits.recordEdit('Point retiré');
      this.writeEdgePoints(page, pageTree, edge, removePoint(edge.points, handle.index));
      this.core.file.documentChanged([page.id]);
      return true;
    }
    if (handle.kind === 'elbow') {
      this.core.edits.recordEdit('Coude basculé');
      setCellStyleValue(pageTree, edge.id, 'elbow', edge.style.elbow === 'vertical' ? 'horizontal' : 'vertical');
      this.core.file.documentChanged([page.id]);
      return true;
    }
    return false;
  }
}
