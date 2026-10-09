import type { LabelEditRequest } from '../../types';
import type { EngineCore } from '../../EngineCore';
import type { ReadonlyShapeModel } from '../../../model/readonly';
import { shapeOf } from '../../../model/pageIndex';

/**
 * Aperçu de la saisie d'un texte édité en place : la forme redessinée avec le texte saisi, rien n'est écrit tant que
 * l'édition n'est pas validée. Tenu par `LabelEditor`, qui masque le label et suit la zone de texte.
 */
export class LabelEditPreview {
  /** Nom d'origine d'une forme dont le texte saisi est montré en direct, à rétablir à la fermeture. */
  private previewed?: { pageId: string; shapeId: string; label: string };
  /** Forme dessinée avec le texte saisi d'une de ses parties (sujet 253), en attendant la validation. */
  private partPreview?: ReadonlyShapeModel;

  constructor(private readonly core: EngineCore) {}

  /** Forme telle qu'elle est dessinée avec le texte saisi d'une partie ; undefined sans aperçu. */
  partShape(): ReadonlyShapeModel | undefined {
    return this.partPreview;
  }

  /**
   * Texte saisi montré : partie d'une forme (sujet 253), ou forme qui place elle-même son label (`editStyle`, ex.
   * onglet d'une région RDD). Vrai si la forme a été redessinée.
   */
  show(editing: LabelEditRequest | undefined, text: string): boolean {
    // Partie d'une forme : la forme redessinée avec ce texte.
    if (editing?.part !== undefined) {
      const preview = this.core.shapeParts.textPreview(editing.elementId, editing.part, text);
      if (!preview) return false;
      this.partPreview = preview;
      this.core.live.rebuildShapeObject(preview);
      return true;
    }
    const current = this.core.pages.getCurrentPage();
    if (!editing || editing.onEdge || current?.id !== editing.pageId) return false;
    const found = shapeOf(current, editing.elementId);
    if (!found || !this.core.registry.editStyle(found) || found.label === text) return false;
    // Copie de travail de la page (sujet 312) : l'aperçu ne touche pas au modèle du document.
    const page = this.core.file.livePage(editing.pageId, this);
    const shape = shapeOf(page, editing.elementId);
    if (!page || !shape) return false;
    this.previewed ??= { pageId: page.id, shapeId: shape.id, label: shape.label };
    shape.label = text;
    this.core.live.rebuildShapeObject(shape);
    return true;
  }

  /** Édition fermée (`editing`, la demande qui l'était) : la forme reprend son dessin. */
  restore(editing: LabelEditRequest): void {
    // Aperçu de la saisie : le nom d'origine revient (une validation l'écrit ensuite et relit la page).
    const previewed = this.previewed;
    this.previewed = undefined;
    const shape = previewed && shapeOf(this.core.pages.pageById(previewed.pageId), previewed.shapeId);
    if (shape && previewed) {
      shape.label = previewed.label;
      if (this.core.pages.currentPageId === previewed.pageId) {
        this.core.live.rebuildShapeObject(shape);
        this.core.live.afterLiveEdit();
      }
      this.core.file.settleLivePage(this);
    }
    // Aperçu d'une partie : la forme reprend son dessin (une validation l'écrit ensuite et relit la page).
    if (this.partPreview) {
      this.partPreview = undefined;
      const shape = shapeOf(this.core.pages.getCurrentPage(), editing.elementId);
      if (shape && editing.pageId === this.core.pages.currentPageId) {
        this.core.live.rebuildShapeObject(shape);
        this.core.live.afterLiveEdit();
      }
    }
  }
}
