import { setPageAttribute } from '../../../format/edit';
import type { PageModel } from '../../../model/types';
import { jumpStyleOf, jumpValue } from '../../../render/edges/jumps';
import type { JumpDefaults } from '../../../render/edges/jumps';
import { SPATIAL } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';

/** Sauts des flèches aux croisements (arc, marche…) : réglage de la page, sinon de l'appli. */
export class EdgeJumps {
  constructor(private readonly core: EngineCore) {}

  jumpsOf(page: PageModel): JumpDefaults {
    const { edgeJumpStyle, edgeJumpSize } = this.core.settings.shapes;
    return { style: jumpValue(page.attributes[SPATIAL.jumps]) ?? edgeJumpStyle, size: edgeJumpSize };
  }

  /** Une flèche visible de la page saute en Arc ou en Marche : relief en volume (ticket 146). */
  hasRaisedJumps(page: PageModel): boolean {
    const jumps = this.jumpsOf(page);
    return page.edges.some((edge) => {
      const style = edge.visible && jumpStyleOf(edge.style, jumps);
      return style === 'arc' || style === 'sharp';
    });
  }

  setPageJumps(pageId: string, jumps: JumpDefaults['style'] | undefined): void {
    const page = this.core.pages.pageById(pageId);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (
      !this.core.file.xmlTree ||
      !page ||
      !pageTree?.diagram ||
      !this.core.targets.editable ||
      this.core.transitions.active
    )
      return;
    if ((page.attributes[SPATIAL.jumps] ?? '') === (jumps ?? '')) return;
    this.core.edits.recordEdit('Croisements des flèches');
    setPageAttribute(pageTree, SPATIAL.jumps, jumps);
    this.core.file.documentChanged([pageId], { distribute: false });
  }
}
