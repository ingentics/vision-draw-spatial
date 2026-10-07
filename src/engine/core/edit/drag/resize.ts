import { resizeCell } from '../../../format/edit';
import type { PageTree } from '../../../format/xmlTree';
import { translateMoveSet } from '../../../edit/move';
import type { MoveSet } from '../../../edit/move';
import { resizeBounds } from '../../../edit/handles';
import { computeBounds } from '../../../model/bounds';
import type { PageModel, Point } from '../../../model/types';
import type { ResizeDrag } from './types';
import type { EngineCore } from '../../EngineCore';

/** Redimensionnement d'une forme par une poignée de son cadre. */
export class ResizeDrags {
  constructor(private readonly core: EngineCore) {}

  follow(page: PageModel, resize: ResizeDrag, point: Point, snap: boolean): void {
    const shape = page.shapes.find((s) => s.id === resize.shapeId);
    if (!shape) return;
    resize.started = true;
    const delta = { x: point.x - resize.start.x, y: point.y - resize.start.y };
    const bounds = resizeBounds(
      resize.origin,
      resize.handle,
      delta,
      snap ? resize.grid : 0,
      this.core.settings.edit.minShapeSize,
    );
    const previous = shape.bounds;
    if (
      bounds.x === previous.x &&
      bounds.y === previous.y &&
      bounds.width === previous.width &&
      bounds.height === previous.height
    ) {
      return;
    }
    // Le contenu garde sa place relative au coin haut-gauche (comme les enfants d'un conteneur draw.io).
    const step = { x: bounds.x - previous.x, y: bounds.y - previous.y };
    const content: MoveSet = { ...resize.children, shapeIds: new Set(resize.children.shapeIds) };
    content.shapeIds.delete(shape.id);
    translateMoveSet(page, content, step);
    this.core.live.translateObjects(content, step);
    shape.bounds = bounds;
    page.bounds = computeBounds(page.shapes, page.edges);
    this.core.live.rebuildShapeObject(shape);
    this.core.live.retraceEdges(page, resize.children.connectedEdgeIds, content.edgeIds);
    this.core.live.afterLiveEdit();
  }

  /** Redimensionnement lâché : géométrie écrite. Vrai s'il reste à répartir les flèches (`afterGeometryEdit`). */
  commit(drag: ResizeDrag, pageTree: PageTree): boolean {
    const shape = this.core.pages.pageById(drag.pageId)?.shapes.find((s) => s.id === drag.shapeId);
    if (!shape) return false;
    const { origin } = drag;
    const delta = {
      x: shape.bounds.x - origin.x,
      y: shape.bounds.y - origin.y,
      width: shape.bounds.width - origin.width,
      height: shape.bounds.height - origin.height,
    };
    if (Object.values(delta).every((d) => d === 0)) return false;
    this.core.edits.recordEdit('Redimensionnement');
    resizeCell(pageTree, drag.shapeId, delta);
    // Le mode de la page remet en ordre autour de la forme (ex. région parente agrandie, sujet 239), même étape.
    if (
      this.core.pageModes.shapesPlaced(drag.pageId, [drag.shapeId], (s) => (s.id === drag.shapeId ? origin : undefined))
    ) {
      this.core.file.documentChanged([drag.pageId]);
      return false;
    }
    return true;
  }
}
