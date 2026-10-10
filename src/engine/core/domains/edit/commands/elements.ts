import { gridSizeOf, setEdgeTerminal } from '../../../format/cellEdits';
import { addEdgeCell, addShapeCell, removeCellsDeep } from '../../../format/create';
import { reorderCells } from '../../../format/order';
import { placeUnder } from '../../../edit/dragPlaces';
import { dropBounds } from '../../../edit/palette';
import { withEdgeLine } from '../../../edit/anchoring/mode';
import type { ShapeTemplate } from '../../../edit/palette';
import { screenToPage } from '../../../interaction/cameraProjection';
import type { PageTree } from '../../../format/xmlTree';
import type { PageModel, Point, Rect } from '../../../model/types';
import { shapeFromStyle } from '../../../format/parse';
import { parseStyle, withStyleDefault } from '../../../format/style';
import { isBlockArrow } from '../../../render/edges/blockArrow';
import { CONNECTOR_STYLE } from '../drag/connect';
import type { EngineCore } from '../../EngineCore';
import { edgeOf, shapeOf } from '../../../model/pageIndex';

/** Ajout d'une forme de la palette et suppression de la sélection. */
export class ElementCommands {
  constructor(private readonly core: EngineCore) {}

  /** `snap` faux (Alt) : pas de place du mode (sujet 481). */
  addShape(template: ShapeTemplate, screen?: Point, snap = true): string | undefined {
    const editable = this.core.targets.editablePage();
    if (!editable) return undefined;
    const { page, pageTree } = editable;
    this.core.gesture.endMove();
    this.core.preview.clearPlaces();
    const dropped = this.droppedBounds(pageTree, template, screen);
    // Déposée dans une place proposée par le mode (sujet 481) : elle s'y pose exactement.
    const bounds = (screen && snap && this.placesFor(page, template, dropped)?.hit) || dropped;
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
   * Forme de la palette glissée au-dessus du canvas (sujet 481) : places proposées par le mode de la page pour la forme
   * qu'on poserait à `screen`, la visée mise en valeur ; rien avec Alt (`snap` faux).
   */
  paletteDragOver(template: ShapeTemplate, screen: Point, snap: boolean): void {
    const editable = this.core.targets.editablePage();
    const offered =
      editable && snap
        ? this.placesFor(editable.page, template, this.droppedBounds(editable.pageTree, template, screen))
        : undefined;
    if (offered) this.core.preview.showPlaces(offered.places, offered.hit);
    else this.core.preview.clearPlaces();
  }

  /** Fin du glisser depuis la palette (lâché, ou sorti du canvas) : places retirées. */
  paletteDragEnd(): void {
    this.core.preview.clearPlaces();
  }

  /** Bornes de la forme déposée à `screen` (le centre de la vue sans point), aimantées à la grille. */
  private droppedBounds(pageTree: PageTree, template: ShapeTemplate, screen?: Point): Rect {
    const at = screenToPage(
      this.core.camera.state,
      this.core.display.viewport,
      screen ?? { x: this.core.display.viewport.width / 2, y: this.core.display.viewport.height / 2 },
    );
    return dropBounds(template, at, gridSizeOf(pageTree));
  }

  /** Places du mode pour la forme du modèle posée à `bounds`, et celle qu'elle vise ; undefined sans place. */
  private placesFor(
    page: PageModel,
    template: ShapeTemplate,
    bounds: Rect,
  ): { places: Rect[]; hit?: Rect } | undefined {
    if (template.edge || !this.core.pageModes.hasDragPlaces(page)) return undefined;
    const shape = shapeFromStyle(PALETTE_SHAPE_ID, template.style, bounds);
    const offered = this.core.pageModes.dragPlaces(page, shape, bounds);
    return offered && { places: offered.places, hit: placeUnder(offered.places, bounds) };
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

/** Id de la forme glissée depuis la palette, pas encore dans le document (aucune cellule ne le porte). */
const PALETTE_SHAPE_ID = 'palette:dragged';
