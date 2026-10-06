import { gridSizeOf } from '../../../format/edit';
import { addShapeCell, removeCellsDeep } from '../../../format/create';
import { reorderCells } from '../../../format/order';
import { documentFromTree } from '../../../format/parse';
import { dropBounds } from '../../../edit/palette';
import type { ShapeTemplate } from '../../../edit/palette';
import { screenToPage } from '../../../interaction/camera';
import type { Point } from '../../../model/types';
import { applyModeEdit } from '../../../modes/edit';
import { modePalette } from '../../../settings';
import { withStyleValue } from '../helpers';
import type { EngineCore } from '../../EngineCore';

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
    this.core.edits.recordEdit('Nouvelle forme');
    const style = withStyleValue(template.style, 'fontSize', String(this.core.settings.shapes.textSize));
    const id = addShapeCell(pageTree, { style, value: template.value, ...bounds });
    if (template.atBack) reorderCells(pageTree, [id], 'back');
    this.core.file.documentChanged([page.id]);
    const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === id);
    if (shape) this.core.selection.select({ type: 'shape', element: shape });
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
    const repair = this.core.modes.modeOf(editable.page)?.repair;
    const page =
      repair &&
      this.core.file.xmlTree &&
      documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === editable.page.id);
    if (repair && page) applyModeEdit(page, editable.pageTree, repair, modePalette(this.core.settings.styles));
    this.core.selection.clearSelection();
    this.core.file.documentChanged([editable.page.id]);
  }
}
