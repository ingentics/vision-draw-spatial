import { gridSizeOf } from '../../../format/edit';
import type { PageTree } from '../../../format/xmlTree';
import {
  applyEndAttachment,
  endAttachmentOf,
  restoreEnds,
  sameAttachment,
  writeEndAttachment,
} from '../../../edit/edgeEnds';
import type { PageModel, Point } from '../../../model/types';
import type { EdgeEndDrag } from './types';
import { samePoints } from '../helpers';
import type { EngineCore } from '../../EngineCore';

/** Bout de flèche déplacé par sa poignée : attaché à une forme (auto ou point fixe) ou libre. */
export class EdgeEndDrags {
  constructor(private readonly core: EngineCore) {}

  /** Bout de flèche suivant le pointeur : tracé recalculé en direct, repères sur la forme visée. */
  follow(page: PageModel, drag: EdgeEndDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const skip = { edgeId: edge.id, end: drag.end, origin: drag.origin };
    const attachment = this.core.anchors.endAttachmentAt(page, screen, {
      skip,
      height: this.core.sceneView.elementTop(edge.id),
      snap,
      grid: gridSizeOf(pageTree),
    });
    this.core.preview.showConnectionHints(page, attachment, undefined, skip);
    if (sameAttachment(attachment, drag.attachment)) return;
    drag.attachment = attachment;
    restoreEnds(edge, drag.original);
    applyEndAttachment(edge, drag.end, attachment);
    // Bout qui referme une boucle sur la forme : coudes recalculés hors de la forme.
    edge.points = this.core.anchors.loopPoints(page, edge) ?? drag.originalPoints.map((p) => ({ ...p }));
    const squared = this.core.anchors.squaredEndPoints(page, edge, drag.end, attachment);
    if (squared) edge.points = squared;
    this.core.live.retraceEdges(page, new Set([edge.id]));
    this.core.live.afterLiveEdit();
  }

  /** Bout de flèche lâché : nouvelle attache écrite (et coudes d'une boucle), sauf s'il revient où il était. */
  commit(drag: EdgeEndDrag, pageTree: PageTree): void {
    const page = this.core.pages.pageById(drag.pageId);
    const edge = page?.edges.find((e) => e.id === drag.edgeId);
    if (!page || !edge) return;
    const before = endAttachmentOf({ ...edge, ...drag.original }, drag.end);
    const after = drag.attachment;
    if (!after || sameAttachment(after, before)) {
      restoreEnds(edge, drag.original);
      edge.points = drag.originalPoints;
      if (this.core.pages.getCurrentPage()?.id === drag.pageId) this.core.live.retraceEdges(page, new Set([edge.id]));
      this.core.live.afterLiveEdit();
      return;
    }
    this.core.edits.recordEdit('Extrémité de flèche');
    writeEndAttachment(pageTree, page, edge, drag.end, after);
    const loop = this.core.anchors.loopPoints(page, edge);
    if (loop) this.core.edgePoints.writeEdgePoints(page, pageTree, edge, loop);
    else if (!samePoints(edge.points, drag.originalPoints))
      this.core.edgePoints.writeEdgePoints(page, pageTree, edge, edge.points);
    this.core.file.documentChanged([drag.pageId]);
  }
}
