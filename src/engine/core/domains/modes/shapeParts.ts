import type { Object3D } from 'three';
import { gridSizeOf } from '../../format/cellEdits';
import type { PageModel, Point, Rect, ShapeModel } from '../../model/types';
import type { ModePartText } from '../../modes/types';
import type { EngineCore } from '../EngineCore';

/**
 * Parties des formes d'un mode de page (sujet 249, ex. champs d'une table RDD) : celle sous le pointeur, son emprise,
 * son texte. La partie sélectionnée vit dans la sélection (`Selection.part`) ; ce domaine n'a pas d'état.
 */
export class ShapeParts {
  /** Partie survolée par la souris (sujet 259), montrée en pré-sélection ; absente hors de toute partie. */
  private hovered: { shapeId: string; part: string } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : plus de partie survolée. */
  resetDocument(): void {
    this.hovered = undefined;
  }

  /** Survol (sujet 259) : la partie sous le pointeur d'une forme d'une page modifiable ; la mise en valeur suit. */
  hover(screen: Point | undefined, shape: ShapeModel | undefined): void {
    const page = this.core.targets.editablePage()?.page;
    const part = screen && shape && page ? this.partAt(page, shape, screen) : undefined;
    const next = shape && part !== undefined ? { shapeId: shape.id, part } : undefined;
    if (next?.shapeId === this.hovered?.shapeId && next?.part === this.hovered?.part) return;
    this.hovered = next;
    this.core.highlight.updateHover();
  }

  /** Partie survolée de la forme `shapeId` (sujet 262) ; undefined si la souris n'est sur aucune de ses parties. */
  hoveredPart(shapeId: string): string | undefined {
    return this.hovered?.shapeId === shapeId ? this.hovered.part : undefined;
  }

  /** Commentaire non vide d'une partie de la page courante (sujet 262) ; undefined sans commentaire. */
  comment(shape: ShapeModel, part: string): { title: string; text: string } | undefined {
    const page = this.core.pages.getCurrentPage();
    const comment = page ? this.core.modes.modeOf(page)?.parts?.comment?.(shape, part) : undefined;
    return comment?.text.trim() ? comment : undefined;
  }

  /**
   * Touche C sur une partie (sujet 262) : l'UI ouvre l'éditeur de commentaire sur elle (`commentEdit`), si le mode sait
   * l'écrire ; faux sinon. `fromNavigation` : partie sélectionnée pour l'occasion, désélectionnée à la sortie.
   */
  editComment(shapeId: string, part: string, fromNavigation = false): boolean {
    const editable = this.core.targets.writablePage();
    const shape = editable?.page.shapes.find((s) => s.id === shapeId);
    const parts = editable && this.core.modes.modeOf(editable.page)?.parts;
    const comment = shape && parts?.comment?.(shape, part);
    // Partie qui ne peut pas avoir de commentaire (ex. séparateur) : pas d'éditeur.
    if (!editable || !shape || !parts?.setComment || !comment) return false;
    this.core.events.emit('commentEdit', {
      pageId: editable.page.id,
      elementId: shapeId,
      onEdge: false,
      part,
      ...(comment.text && { comment: { text: comment.text } }),
      ...(fromNavigation && { fromNavigation }),
    });
    return true;
  }

  /** Commentaire d'une partie validé (touche C) : opération du mode (une étape d'annulation). */
  setComment(shapeId: string, part: string, text: string): void {
    const page = this.core.targets.writablePage()?.page;
    const shape = page?.shapes.find((s) => s.id === shapeId);
    const setComment = page && this.core.modes.modeOf(page)?.parts?.setComment;
    if (!shape || !setComment) return;
    this.core.pageModes.editPageMode('Commentaire', (edit) => setComment(edit, shape, part, text));
  }

  /** Emprise de la partie survolée (pixels de page), et sa forme ; undefined sans survol ou si elle est sélectionnée. */
  hoveredBounds(): { shape: ShapeModel; rect: Rect } | undefined {
    const hovered = this.hovered;
    const selection = this.core.selection.current;
    if (selection?.part === hovered?.part && selection?.picked.element.id === hovered?.shapeId) return undefined;
    const page = this.core.pages.getCurrentPage();
    const shape = hovered && page?.shapes.find((s) => s.id === hovered.shapeId);
    const rect = shape && page && this.core.modes.modeOf(page)?.parts?.bounds(page, shape, hovered.part);
    return shape && rect ? { shape, rect } : undefined;
  }

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
    // Partie glissée (sujet 252) : à sa place dans l'aperçu.
    const previewed = this.core.partDrags.previewed();
    const shape = previewed?.shape ?? page.shapes.find((s) => s.id === selection.picked.element.id);
    const part = previewed?.part ?? selection.part;
    const rect = shape && this.core.modes.modeOf(page)?.parts?.bounds(page, shape, part);
    return shape && rect ? { shape, rect } : undefined;
  }

  /**
   * Texte modifiable d'une partie de la page courante ; undefined s'il n'y en a pas. `shape` : la forme telle qu'elle
   * est dessinée, si ce n'est pas celle du modèle (aperçu de la saisie).
   */
  text(shapeId: string, part: string, shape?: ShapeModel): ModePartText | undefined {
    const page = this.core.pages.getCurrentPage();
    const target = shape ?? page?.shapes.find((s) => s.id === shapeId);
    return page && target ? this.core.modes.modeOf(page)?.parts?.text?.(page, target, part) : undefined;
  }

  /** Forme telle qu'elle serait avec ce texte sur la partie (aperçu de la saisie, sujet 253) ; undefined sans aperçu. */
  textPreview(shapeId: string, part: string, text: string): ShapeModel | undefined {
    const page = this.core.pages.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === shapeId);
    const tree = page && this.core.file.pageTreeOf(page.id);
    const gridSize = tree && tree.encoding !== 'unreadable' ? gridSizeOf(tree) : 0;
    return page && shape ? this.core.modes.modeOf(page)?.parts?.textPreview?.(shape, part, text, gridSize) : undefined;
  }

  /** Objets du texte dessiné d'une partie (marqués `userData.part` par le rendu du mode). */
  textObjects(shapeId: string, part: string): Object3D[] {
    const found: Object3D[] = [];
    this.core.sceneView.sceneObject(shapeId)?.traverse((object) => {
      if (object.userData.part === part) found.push(object);
    });
    return found;
  }

  /**
   * Suppr avec une partie sélectionnée (sujet 251) : la partie est retirée par le mode (une étape d'annulation), la
   * forme reste sélectionnée seule. Vrai si une partie était sélectionnée (la forme n'est alors jamais supprimée).
   */
  removeSelected(): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || selection?.part === undefined || selection.pageId !== editable.page.id) return false;
    const shape = editable.page.shapes.find((s) => s.id === selection.picked.element.id);
    const remove = this.core.modes.modeOf(editable.page)?.parts?.remove;
    if (!shape || !remove) return true;
    const part = selection.part;
    // Refusée par le mode (ex. clé primaire) : rien ne change, la partie reste sélectionnée.
    if (!this.core.pageModes.editPageMode('Suppression', (edit) => remove(edit, shape, part))) return true;
    // Le rang de la partie retirée désigne maintenant la suivante : la sélection revient à la forme.
    const fresh = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === shape.id);
    if (fresh) this.core.selection.selectItems([{ type: 'shape', element: fresh }]);
    return true;
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
