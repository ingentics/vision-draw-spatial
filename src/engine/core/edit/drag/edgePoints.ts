import { gridSizeOf } from '../../../format/cellEdits';
import type { PageTree } from '../../../format/xmlTree';
import { dragPoints } from '../../../edit/edgePointEdits';
import type { PageModel, Point } from '../../../model/types';
import type { EdgePointsDrag } from './types';
import { samePoints } from '../helpers';
import type { EngineCore } from '../../EngineCore';

/** Poignée entre les bouts d'une flèche (segment, coude, point) : points intermédiaires recalculés. */
export class EdgePointsDrags {
  constructor(private readonly core: EngineCore) {}

  /** Poignée entre les bouts suivant le pointeur (aimanté à la grille) : points recalculés, tracé en direct. */
  follow(page: PageModel, drag: EdgePointsDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const raw = this.core.picking.groundPointAtHeight(screen, this.core.sceneView.elementTop(edge.id));
    const grid = gridSizeOf(pageTree);
    const step = snap && grid > 0 ? grid : 1;
    const pointer = { x: Math.round(raw.x / step) * step, y: Math.round(raw.y / step) * step };
    const points = dragPoints(drag.context, drag.handle, pointer);
    if (drag.points && samePoints(points, drag.points)) return;
    drag.points = points;
    edge.points = points;
    this.core.live.retraceEdges(page, new Set([edge.id]));
    this.core.live.afterLiveEdit();
  }

  /** Points d'une flèche lâchés : écrits, sauf s'ils reviennent à leur place. */
  commit(drag: EdgePointsDrag, pageTree: PageTree): void {
    const page = this.core.pages.pageById(drag.pageId);
    const edge = page?.edges.find((e) => e.id === drag.edgeId);
    if (!page || !edge) return;
    if (!drag.points || samePoints(drag.points, drag.original)) {
      edge.points = drag.original;
      if (this.core.pages.getCurrentPage()?.id === drag.pageId) this.core.live.retraceEdges(page, new Set([edge.id]));
      this.core.live.afterLiveEdit();
      return;
    }
    this.core.edits.recordEdit('Points de la flèche');
    this.core.edgePoints.writeEdgePoints(page, pageTree, edge, drag.points);
    this.core.file.documentChanged([drag.pageId]);
  }
}
