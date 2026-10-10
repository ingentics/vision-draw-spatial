import { gridSizeOf, setEdgeTerminal } from '../../../format/cellEdits';
import { addEdgeCell, addShapeCell, removeCellsDeep } from '../../../format/create';
import { reorderCells } from '../../../format/order';
import { dropBounds } from '../../../edit/palette';
import { withEdgeLine } from '../../../edit/anchoring/mode';
import type { ShapeTemplate } from '../../../edit/palette';
import { screenToPage } from '../../../interaction/cameraProjection';
import type { PageTree } from '../../../format/xmlTree';
import type { PageModel, Point, Rect } from '../../../model/types';
import { parseStyle, withStyleDefault } from '../../../format/style';
import { isBlockArrow } from '../../../render/edges/blockArrow';
import { CONNECTOR_STYLE } from '../drag/connect';
import type { EngineCore } from '../../EngineCore';
import { edgeOf, shapeOf } from '../../../model/pageIndex';

/** Ajout d'une forme de la palette et suppression de la sélection. */
export class ElementCommands {
  constructor(private readonly core: EngineCore) {}

  addShape(template: ShapeTemplate, screen?: Point): string | undefined {
    const editable = this.core.targets.editablePage();
    if (!editable) return undefined;
    const { page, pageTree } = editable;
    this.core.gesture.endMove();
    const at = screenToPage(
      this.core.camera.state,
      this.core.display.viewport,
      screen ?? { x: this.core.display.viewport.width / 2, y: this.core.display.viewport.height / 2 },
    );
    const bounds = dropBounds(template, at, gridSizeOf(pageTree));
    if (template.edge) return this.addFreeEdge(template, page, pageTree, bounds);
    this.core.edits.recordEdit('Nouvelle forme');
    const style = withStyleDefault(template.style, 'fontSize', String(this.core.settings.shapes.textSize));
    const id = addShapeCell(pageTree, { style, value: template.value, ...bounds });
    if (template.atBack) reorderCells(pageTree, [id], 'back');
    this.core.modeFollowUps.shapesPlaced(page.id, [id]);
    this.core.file.documentChanged([page.id]);
    const shape = shapeOf(this.core.pages.getCurrentPage(), id);
    if (shape) this.core.selection.select({ type: 'shape', element: shape });
    return id;
  }

  /**
   * Flèche libre de la palette : horizontale, ses deux bouts posés aux extrémités de `bounds`, au style des flèches
   * créées (tracé de la page) ; une flèche pleine, toujours droite (sujet 410), ne reçoit pas le tracé du réglage.
   */
  private addFreeEdge(template: ShapeTemplate, page: PageModel, pageTree: PageTree, bounds: Rect): string {
    this.core.edits.recordEdit('Nouvelle flèche');
    const straight = isBlockArrow(parseStyle(template.style).values);
    const line = template.style + CONNECTOR_STYLE;
    const lined = straight ? line : withEdgeLine(line, this.core.arrangement.edgeLineOf(page));
    const style = withStyleDefault(lined, 'fontSize', String(this.core.settings.shapes.textSize));
    const id = addEdgeCell(pageTree, { style });
    const y = bounds.y + bounds.height / 2;
    setEdgeTerminal(pageTree, id, 'source', { point: { x: bounds.x, y } });
    setEdgeTerminal(pageTree, id, 'target', { point: { x: bounds.x + bounds.width, y } });
    this.core.modeFollowUps.edgeCreated(page.id, id);
    this.core.file.documentChanged([page.id]);
    const edge = edgeOf(this.core.pages.getCurrentPage(), id);
    if (edge) this.core.selection.select({ type: 'edge', element: edge });
    return id;
  }

  deleteSelection(label = 'Suppression'): void {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    this.core.edits.recordEdit(label);
    removeCellsDeep(
      editable.pageTree,
      selection.items.map((item) => item.element.id),
    );
    // Le mode de la page remet ses données en ordre (ex. rangs resserrés), dans la même étape d'annulation.
    this.core.modeFollowUps.elementsRemoved(editable.page.id);
    this.core.selection.clearSelection();
    this.core.file.documentChanged([editable.page.id]);
  }
}
