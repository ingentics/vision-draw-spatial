import type { PageModel, Point, Rect, ShapeModel } from '../../model/types';
import type { ModePartText } from '../../modes/types';
import type { EngineCore } from '../EngineCore';

/**
 * Parties des formes d'un mode de page (sujet 249, ex. champs d'une table RDD) : celle sous le pointeur, son emprise,
 * son texte. La partie sélectionnée vit dans la sélection (`Selection.part`) ; ce domaine n'a pas d'état.
 */
export class ShapeParts {
  constructor(private readonly core: EngineCore) {}

  /** `part` si le mode de la page la connaît encore sur `shape`, sinon undefined. */
  validPart(page: PageModel, shape: ShapeModel, part: string): string | undefined {
    const parts = this.core.modes.modeOf(page)?.parts;
    return parts?.bounds(page, shape, part) ? part : undefined;
  }

  /** Partie de `shape` sous le point écran ; undefined = la forme elle-même, ou un mode sans parties. */
  partAt(page: PageModel, shape: ShapeModel, screen: Point): string | undefined {
    const parts = this.core.modes.modeOf(page)?.parts;
    if (!parts) return undefined;
    const point = this.core.picking.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
    return parts.at(page, shape, point);
  }

  /** Emprise de la partie sélectionnée (pixels de page) ; undefined sans partie sélectionnée. */
  selectedBounds(): { shape: ShapeModel; rect: Rect } | undefined {
    const selection = this.core.selection.current;
    const page = this.core.pages.getCurrentPage();
    if (!selection || selection.part === undefined || !page || selection.pageId !== page.id) return undefined;
    const shape = page.shapes.find((s) => s.id === selection.picked.element.id);
    const rect = shape && this.core.modes.modeOf(page)?.parts?.bounds(page, shape, selection.part);
    return shape && rect ? { shape, rect } : undefined;
  }

  /** Texte modifiable d'une partie de la page courante ; undefined s'il n'y en a pas. */
  text(shapeId: string, part: string): ModePartText | undefined {
    const page = this.core.pages.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === shapeId);
    return page && shape ? this.core.modes.modeOf(page)?.parts?.text?.(page, shape, part) : undefined;
  }

  /** Texte validé d'une partie : opération du mode (une étape d'annulation). */
  setText(shapeId: string, part: string, text: string): void {
    const page = this.core.targets.editablePage()?.page;
    const shape = page?.shapes.find((s) => s.id === shapeId);
    const setText = page && this.core.modes.modeOf(page)?.parts?.setText;
    if (!shape || !setText) return;
    this.core.pageModes.editPageMode('Texte', (edit) => setText(edit, shape, part, text));
  }
}
