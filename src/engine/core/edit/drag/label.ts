import { setLabelPlacement } from '../../../format/edit';
import type { PageTree } from '../../../format/xmlTree';
import { setEdgeTextPlacement } from '../../../edit/edgeLabels';
import { length as polylineLength, placementAt } from '../../../render/edges/polyline';
import type { PageModel, Point } from '../../../model/types';
import type { LabelDrag } from './types';
import type { EngineCore } from '../../EngineCore';

/** Texte d'une flèche déplacé (le long du tracé et de côté). */
export class LabelDrags {
  constructor(private readonly core: EngineCore) {}

  /** Texte de flèche suivant le pointeur : le point du tracé le plus proche, et l'écart de côté. */
  follow(page: PageModel, drag: LabelDrag, screen: Point): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const route = this.core.sceneView.sceneObject(drag.edgeId)?.userData.route as Point[] | undefined;
    if (!edge || !route?.length) return;
    drag.started = true;
    const point = this.core.picking.groundPointAtHeight(screen, this.core.sceneView.elementTop(drag.edgeId));
    let placement = placementAt(route, point, drag.offset);
    // Texte du milieu qui suit la flèche, glissé le long du trait : le point visé est celui du texte glissé.
    const shift = drag.cellId === edge.id ? this.core.edgeTexts.followedText(edge.id)?.shift : undefined;
    if (shift) {
      const position = Math.min(1, Math.max(-1, placement.position - (2 * shift) / polylineLength(route)));
      placement = { ...placement, position };
    }
    drag.placement = placement;
    setEdgeTextPlacement(edge, drag.cellId, placement);
    this.core.live.retraceEdges(page, new Set([edge.id]));
    this.core.live.afterLiveEdit();
  }

  /** Texte de flèche lâché : sa position écrite. */
  commit(drag: LabelDrag, pageTree: PageTree): void {
    if (!drag.placement) return;
    this.core.edits.recordEdit('Position du texte');
    setLabelPlacement(pageTree, drag.cellId, drag.placement);
    this.core.file.documentChanged([drag.pageId]);
  }
}
