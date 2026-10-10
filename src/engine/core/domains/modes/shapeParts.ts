import type { Object3D } from 'three';
import { gridSizeOf } from '../../format/cellEdits';
import type { EndAttachment } from '../../edit/edgeEnds';
import type { PageModel, Point, Rect } from '../../model/types';
// Formes en lecture seule : ce domaine les passe aux modes (sujet 303), aperçus compris.
import type { ReadonlyShapeModel as ShapeModel } from '../../model/readonly';
import { callMode } from '../../modes/modeCalls';
import type { ModeSizing } from '../../modes/modeEdit';
import type { ModeParts, ModePartText } from '../../modes/types';
import type { EngineCore } from '../EngineCore';
import { partOf } from '../../render/partMarks';
import { edgeOf, shapeOf } from '../../model/pageIndex';

/** Point d'entrée `K` des parties d'un mode. */
type PartEntry<K extends keyof ModeParts> = NonNullable<ModeParts[K]>;

/**
 * Parties des formes d'un mode de page (sujet 249, ex. champs d'une table RDD) : celle sous le pointeur, son emprise,
 * son texte, son glisser. La partie sélectionnée vit dans la sélection (`Selection.part`). Chaque appel au mode est
 * protégé (sujet 288).
 */
export class ShapeParts {
  /** Partie survolée par la souris (sujet 259), montrée en pré-sélection ; absente hors de toute partie. */
  private hovered: { shapeId: string; part: string } | undefined;
  /** Flèche survolée (sujet 373) : sa partie liée (`ModeParts.edgePart`) est montrée comme survolée. */
  private hoveredEdge: string | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : plus de partie survolée. */
  resetDocument(): void {
    this.hovered = undefined;
    this.hoveredEdge = undefined;
  }

  /**
   * Point d'entrée `hook` des parties du mode de la page, appelé avec `args` par l'hôte (`PageModes.call` : lecture
   * seule et protection) : undefined si le mode n'en a pas ou s'il lève une exception.
   */
  private call<K extends keyof ModeParts>(
    page: PageModel | undefined,
    hook: K,
    ...args: Parameters<PartEntry<K>>
  ): ReturnType<PartEntry<K>> | undefined {
    const mode = page && this.core.modes.modeOf(page);
    if (!mode) return undefined;
    // `ModeParts[K]` pour un `K` générique : TypeScript ne relie pas le point d'entrée à ses arguments.
    const entry = mode.parts?.[hook] as ((...args: Parameters<PartEntry<K>>) => ReturnType<PartEntry<K>>) | undefined;
    return this.core.pageModes.call(mode, `parts.${hook}`, undefined, entry, ...args);
  }

  /** Le mode de la page a-t-il ce point d'entrée de parties ? */
  private has(page: PageModel | undefined, hook: keyof ModeParts): boolean {
    return !!(page && this.core.modes.modeOf(page)?.parts?.[hook]);
  }

  /**
   * Survol (sujet 259) : la partie sous le pointeur d'une forme d'une page modifiable, ou la flèche survolée (sujet
   * 373) ; la mise en valeur suit.
   */
  hover(screen: Point | undefined, shape: ShapeModel | undefined, edgeId?: string): void {
    const page = this.core.targets.editablePage()?.page;
    const part = screen && shape && page ? this.partAt(page, shape, screen) : undefined;
    const next = shape && part !== undefined ? { shapeId: shape.id, part } : undefined;
    const edge = page ? edgeId : undefined;
    if (next?.shapeId === this.hovered?.shapeId && next?.part === this.hovered?.part && edge === this.hoveredEdge)
      return;
    this.hovered = next;
    this.hoveredEdge = edge;
    this.core.highlight.updateHover();
  }

  /** Partie survolée de la forme `shapeId` (sujet 262) ; undefined si la souris n'est sur aucune de ses parties. */
  hoveredPart(shapeId: string): string | undefined {
    return this.hovered?.shapeId === shapeId ? this.hovered.part : undefined;
  }

  /** Commentaire non vide d'une partie de la page courante (sujet 262) ; undefined sans commentaire. */
  comment(shape: ShapeModel, part: string): { title: string; text: string } | undefined {
    const page = this.core.pages.getCurrentPage();
    const comment = page && this.call(page, 'comment', shape, part, page);
    return comment?.text.trim() ? comment : undefined;
  }

  /**
   * Touche C sur une partie (sujet 262) : l'UI ouvre l'éditeur de commentaire sur elle (`commentEdit`), si le mode sait
   * l'écrire ; faux sinon. `fromNavigation` : partie sélectionnée pour l'occasion, désélectionnée à la sortie.
   */
  editComment(shapeId: string, part: string, fromNavigation = false): boolean {
    const editable = this.core.targets.writablePage();
    const shape = shapeOf(editable?.page, shapeId);
    const comment = editable && shape && this.call(editable.page, 'comment', shape, part, editable.page);
    // Partie qui ne peut pas avoir de commentaire (ex. séparateur) : pas d'éditeur.
    if (!editable || !shape || !this.has(editable.page, 'setComment') || !comment) return false;
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
    const shape = shapeOf(page, shapeId);
    const setComment = page && this.core.modes.modeOf(page)?.parts?.setComment;
    if (!shape || !setComment) return;
    this.core.pageModes.editPageMode('Commentaire', (edit) => callMode(setComment, edit, shape, part, text));
  }

  /** Emprise d'une partie (pixels de page) d'après le mode de la page ; undefined = partie disparue. */
  bounds(page: PageModel, shape: ShapeModel, part: string): Rect | undefined {
    return this.call(page, 'bounds', page, shape, part);
  }

  /**
   * Emprises montrées comme survolées (pixels de page), et leur forme : la partie survolée, et la partie liée à la
   * flèche survolée ou sélectionnée (sujet 373) ; ni la partie sélectionnée, ni deux fois la même.
   */
  hoveredBounds(): { shape: ShapeModel; rect: Rect }[] {
    const page = this.core.pages.getCurrentPage();
    if (!page) return [];
    const selection = this.core.selection.current;
    const selectedEdges =
      this.core.targets.editablePage()?.page.id === page.id && selection?.pageId === page.id
        ? selection.items.filter((item) => item.type === 'edge').map((item) => item.element.id)
        : [];
    const edgeIds = [...new Set([...(this.hoveredEdge ? [this.hoveredEdge] : []), ...selectedEdges])];
    const parts = [
      ...(this.hovered ? [this.hovered] : []),
      ...edgeIds.flatMap((id) => {
        const edge = edgeOf(page, id);
        const linked = edge && this.call(page, 'edgePart', page, edge);
        return linked ? [linked] : [];
      }),
    ];
    const shown = new Set<string>();
    return parts.flatMap(({ shapeId, part }) => {
      const key = `${shapeId}:${part}`;
      if (shown.has(key)) return [];
      shown.add(key);
      if (selection?.part === part && selection.picked.element.id === shapeId) return [];
      const shape = shapeOf(page, shapeId);
      const rect = shape && this.bounds(page, shape, part);
      return shape && rect ? [{ shape, rect }] : [];
    });
  }

  /** `part` si le mode de la page la connaît encore sur `shape`, sinon undefined. */
  validPart(page: PageModel, shape: ShapeModel, part: string): string | undefined {
    return this.bounds(page, shape, part) ? part : undefined;
  }

  /** Partie de `shape` sous le point écran ; undefined = la forme elle-même, ou un mode sans parties. */
  partAt(page: PageModel, shape: ShapeModel, screen: Point): string | undefined {
    if (!this.has(page, 'at')) return undefined;
    return this.at(
      page,
      shape,
      this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id)),
    );
  }

  /**
   * Partie au texte modifiable sans être sélectionnable (`ModeParts.textAt`, sujet 269) sous le point écran ; undefined
   * s'il n'y en a pas.
   */
  textPartAt(page: PageModel, shape: ShapeModel, screen: Point): string | undefined {
    if (!this.has(page, 'textAt')) return undefined;
    const point = this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(shape.id));
    return this.call(page, 'textAt', page, shape, point);
  }

  /**
   * Partie au texte dessiné hors de toute forme (`ModeParts.outsideTextAt`, sujet 514) sous le point écran, au sol ;
   * undefined s'il n'y en a pas.
   */
  outsideTextAt(page: PageModel, screen: Point): { shapeId: string; part: string } | undefined {
    if (!this.has(page, 'outsideTextAt')) return undefined;
    return this.call(page, 'outsideTextAt', page, this.core.projection.groundPointAtHeight(screen, 0));
  }

  /**
   * Partie dont le texte s'édite à la place de celui de la forme (`ModeParts.labelPart`, sujet 414) ; undefined : le
   * texte de la forme.
   */
  labelPart(page: PageModel, shape: ShapeModel): string | undefined {
    return this.call(page, 'labelPart', page, shape, this.currentOf(page));
  }

  /** Courant du mode de la page, remis aux textes des parties (sujet 414). */
  private currentOf(page: PageModel): string | undefined {
    return this.core.modeCurrents.getModeCurrent(page.id);
  }

  /** Partie de `shape` sous un point de la page (pixels) ; undefined = la forme elle-même, ou un mode sans parties. */
  at(page: PageModel, shape: ShapeModel, point: Point): string | undefined {
    return this.call(page, 'at', page, shape, point);
  }

  /**
   * Partie visée par un bout d'arrivée attaché à une forme (sujet 333), sous le point écran ; undefined = la forme
   * elle-même, ou bout libre.
   */
  targetedPart(page: PageModel, attachment: EndAttachment | undefined, screen: Point): string | undefined {
    const shape = attachment && attachment.kind !== 'free' && shapeOf(page, attachment.shapeId);
    return shape ? this.partAt(page, shape, screen) : undefined;
  }

  /** Emprise de la partie sélectionnée (pixels de page) ; undefined sans partie sélectionnée. */
  selectedBounds(): { shape: ShapeModel; rect: Rect } | undefined {
    const selection = this.core.selection.current;
    const page = this.core.pages.getCurrentPage();
    if (!selection || selection.part === undefined || !page || selection.pageId !== page.id) return undefined;
    // Partie glissée (sujet 252) : à sa place dans l'aperçu.
    const previewed = this.core.partDrags.previewed();
    const shape = previewed?.shape ?? shapeOf(page, selection.picked.element.id);
    const part = previewed?.part ?? selection.part;
    const rect = shape && this.bounds(page, shape, part);
    return shape && rect ? { shape, rect } : undefined;
  }

  /**
   * Texte modifiable d'une partie de la page courante ; undefined s'il n'y en a pas. `shape` : la forme telle qu'elle
   * est dessinée, si ce n'est pas celle du modèle (aperçu de la saisie).
   */
  text(shapeId: string, part: string, shape?: ShapeModel): ModePartText | undefined {
    const page = this.core.pages.getCurrentPage();
    const target = shape ?? shapeOf(page, shapeId);
    return page && target ? this.call(page, 'text', page, target, part, this.currentOf(page)) : undefined;
  }

  /** Forme telle qu'elle serait avec ce texte sur la partie (aperçu de la saisie, sujet 253) ; undefined sans aperçu. */
  textPreview(shapeId: string, part: string, text: string): ShapeModel | undefined {
    const page = this.core.pages.getCurrentPage();
    const shape = shapeOf(page, shapeId);
    const tree = page && this.core.file.pageTreeOf(page.id);
    const sizing: ModeSizing = Object.freeze({
      gridSize: tree && tree.encoding !== 'unreadable' ? gridSizeOf(tree) : 0,
      measureText: this.core.textMeasure.measure,
    });
    return page && shape ? this.call(page, 'textPreview', shape, part, text, sizing, this.currentOf(page)) : undefined;
  }

  /** Objets du texte dessiné d'une partie (marqués par `markPart` dans le rendu du mode). */
  textObjects(shapeId: string, part: string): Object3D[] {
    const found: Object3D[] = [];
    this.core.sceneView.sceneObject(shapeId)?.traverse((object) => {
      if (partOf(object) === part) found.push(object);
    });
    return found;
  }

  /** Le mode de la page sait-il glisser une partie (`dropAt` et `move`, sujet 252) ? */
  canDrag(page: PageModel): boolean {
    return this.has(page, 'dropAt') && this.has(page, 'move');
  }

  /** Place visée par le glisser d'une partie sous `point` (pixels de page) ; undefined = aucune. */
  dropAt(page: PageModel, shape: ShapeModel, part: string, point: Point): string | undefined {
    return this.call(page, 'dropAt', page, shape, part, point);
  }

  /** Forme telle qu'elle serait avec la partie à la place `target`, et la partie à cette place ; undefined sans aperçu. */
  dragPreview(
    page: PageModel,
    shape: ShapeModel,
    part: string,
    target: string,
  ): { shape: ShapeModel; part: string } | undefined {
    return this.call(page, 'preview', shape, part, target);
  }

  /**
   * Lâcher d'une partie sur la place `target` : opération du mode (une étape d'annulation, `label`). Renvoie si quelque
   * chose a changé, et la partie à sélectionner ensuite.
   */
  move(label: string, shape: ShapeModel, part: string, target: string): { changed: boolean; next: string | undefined } {
    const page = this.core.targets.editablePage()?.page;
    const move = page && this.core.modes.modeOf(page)?.parts?.move;
    let next: string | undefined;
    const changed =
      !!move && this.core.pageModes.editPageMode(label, (edit) => (next = callMode(move, edit, shape, part, target)));
    return { changed, next };
  }

  /**
   * Suppr avec une partie sélectionnée (sujet 251) : la partie est retirée par le mode (une étape d'annulation), la
   * forme reste sélectionnée seule. Vrai si une partie était sélectionnée (la forme n'est alors jamais supprimée).
   */
  removeSelected(): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || selection?.part === undefined || selection.pageId !== editable.page.id) return false;
    const shape = shapeOf(editable.page, selection.picked.element.id);
    const remove = this.core.modes.modeOf(editable.page)?.parts?.remove;
    if (!shape || !remove) return true;
    const part = selection.part;
    // Refusée par le mode (ex. clé primaire) : rien ne change, la partie reste sélectionnée.
    if (!this.core.pageModes.editPageMode('Suppression', (edit) => callMode(remove, edit, shape, part))) return true;
    // Le rang de la partie retirée désigne maintenant la suivante : la sélection revient à la forme.
    const fresh = shapeOf(this.core.pages.getCurrentPage(), shape.id);
    if (fresh) this.core.selection.selectItems([{ type: 'shape', element: fresh }]);
    return true;
  }

  /** Texte validé d'une partie : opération du mode (une étape d'annulation). */
  setText(shapeId: string, part: string, text: string): void {
    const page = this.core.targets.editablePage()?.page;
    const shape = shapeOf(page, shapeId);
    const setText = page && this.core.modes.modeOf(page)?.parts?.setText;
    if (!shape || !setText) return;
    const current = this.currentOf(page);
    this.core.pageModes.editPageMode('Texte', (edit) => callMode(setText, edit, shape, part, text, current));
  }
}
