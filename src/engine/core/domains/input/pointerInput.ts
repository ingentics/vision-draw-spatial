import { isNavigableLink } from '../../format/link';
import { commentOf, sameComment, withPartComment } from '../../edit/comment';
import type { ElementComment } from '../../edit/comment';
import type { PointHandle } from '../../edit/edgePointEdits';
import { endAt } from '../../edit/edgeLabels';
import { positionAlong } from '../../render/edges/polyline';
import { isConnectHandle } from '../../edit/handleKinds';
import type { Point, ShapeModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import type { ResizeHandle } from '../../edit/handleKinds';
import type { PickedElement } from '../../interaction/pick';

/** Curseur de chaque poignée de redimensionnement. */
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/**
 * Gestes du pointeur sur le canvas : clic (sélection, lien), double-clic (lien, édition du texte), survol (curseur,
 * infobulle, préchargement).
 */
export class PointerInput {
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Commentaire signalé à l'UI (`commentHover`), pour ne l'émettre qu'à un changement. */
  private hoverComment: ElementComment | undefined;
  /** Forme ou flèche sous le curseur (touche C sans sélection : éditer son commentaire). */
  private hovered: PickedElement | undefined;

  constructor(private readonly core: EngineCore) {}

  dispose(): void {
    clearTimeout(this.hoverTimer);
  }

  /** Curseur d'une poignée entre les bouts (segment : perpendiculaire à lui). */
  pointHandleCursor(handle: PointHandle, style: Record<string, string>): string {
    if (handle.kind === 'segment') return handle.vertical ? 'col-resize' : 'row-resize';
    if (handle.kind === 'elbow')
      return style.edgeStyle === 'topToBottomEdgeStyle' ||
        (style.edgeStyle === 'elbowEdgeStyle' && style.elbow === 'vertical')
        ? 'row-resize'
        : 'col-resize';
    return 'move';
  }

  /**
   * Clic : sélectionne l'élément ; avec la touche de sélection multiple, l'ajoute ou le retire (le vide
   * ne désélectionne pas). `followLink` (touche + clic, `controls.followLinkGesture`) : suit le lien de
   * l'élément, s'il en a un.
   */
  handleClick(screen: Point, toggle = false, followLink = false): void {
    // Simulation ouverte (sujet 461) : un clic ne sélectionne rien, il choisit au plus une flèche proposée.
    if (this.core.simulations.click(screen)) return;
    // Poignée propre au mode (sujet 250) : son menu, rien d'autre.
    if (!toggle && !followLink && this.core.modeHandles.click(screen)) return;
    const picked = this.core.picking.pickAt(screen);
    // Pas de mode navigation sur la vue graphe (sujet 364) : touche + clic n'y suit pas de lien.
    if (followLink && picked && !this.core.graph.isGraphView() && isNavigableLink(picked.element.link)) {
      this.core.links.followLink(picked.element.id);
      return;
    }
    // Espace + clic hors d'une forme liée : rien (Espace sert au déplacement de la vue, pas à la sélection).
    if (followLink && this.core.settings.controls.followLinkKey === 'space') return;
    if (toggle) {
      if (picked) this.core.selection.toggleSelect(picked);
      return;
    }
    // Mode de la page : un clic sur un élément d'un autre courant (ex. flèche d'un autre flux) ne fait que changer
    // de courant ; un second clic le sélectionne.
    const page = this.core.pages.getCurrentPage();
    if (picked && page && this.core.modeCurrents.pickModeCurrent(page, picked.element)) {
      this.core.selection.clearSelection();
      return;
    }
    // Un clic sur une partie d'une forme (ex. champ d'une table RDD) la sélectionne directement (sujet 249).
    const part =
      picked?.type === 'shape' && page
        ? this.core.shapeParts.partAt(page, picked.element as ShapeModel, screen)
        : undefined;
    if (picked) this.core.selection.selectItems([picked], part);
    else this.core.selection.select(undefined);
    if (this.core.settings.preload.onClick) this.core.links.preloadLink(picked?.element.link);
  }

  /**
   * Double-clic : avec la touche pour suivre un lien (quand le geste choisi est le double-clic), ou sur
   * une carte de la vue graphe, suit le lien ; sinon, édite le label de l'élément (page modifiable).
   * Sur une flèche, près d'un bout, édite son texte de début ou de fin.
   */
  handleDoubleClick(screen: Point, followLink: boolean): void {
    if (this.core.simulations.current) return;
    if (this.core.edgePoints.doubleClickPointHandle(screen)) return;
    const picked = this.core.picking.pickAt(screen);
    const text = picked?.type === 'edge' ? this.core.picking.edgeTextAt(screen) : undefined;
    const follow = followLink || this.core.graph.isGraphView();
    if (picked && follow && isNavigableLink(picked.element.link)) this.core.links.followLink(picked.element.id);
    else if (text) this.core.edgeTexts.editEdgeText(text.edge.id, text.cellId);
    else if (picked?.type === 'edge') {
      // Près d'un bout : texte de début ou de fin ; vers le milieu : label de la flèche.
      const route = this.core.sceneView.sceneObject(picked.element.id)?.userData.route as Point[] | undefined;
      const point = this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(picked.element.id));
      const end = route ? endAt(positionAlong(route, point)) : undefined;
      if (end) this.core.labelEditor.editEdgeEndLabel(picked.element.id, end);
      else this.core.labelEditor.editLabel(picked.element.id);
    } else if (picked) {
      // Partie d'une forme qui a un texte (ex. champ d'une table RDD, sujet 249) : son texte, pas celui de la forme.
      const page = this.core.pages.getCurrentPage();
      const part =
        picked.type === 'shape' && page
          ? this.core.shapeParts.partAt(page, picked.element as ShapeModel, screen)
          : undefined;
      // Texte d'une forme qui n'est pas une partie sélectionnable (ex. corps d'un document RDD, sujet 269).
      const textPart =
        part === undefined && picked.type === 'shape' && page
          ? this.core.shapeParts.textPartAt(page, picked.element as ShapeModel, screen)
          : undefined;
      // Une partie sans texte modifiable (ex. clé primaire `id`, sujet 260) : sélectionnée, rien d'autre.
      if (part !== undefined) {
        this.core.selection.selectItems([picked], part);
        if (this.core.shapeParts.text(picked.element.id, part))
          this.core.labelEditor.editPartLabel(picked.element.id, part);
      } else if (textPart !== undefined && this.core.shapeParts.text(picked.element.id, textPart)) {
        this.core.selection.selectItems([picked]);
        this.core.labelEditor.editPartLabel(picked.element.id, textPart);
      } else this.core.labelEditor.editLabel(picked.element.id);
    }
  }

  /** Survol : curseur main et infobulle sur les éléments liés, commentaire de l'élément ; préchargement optionnel. */
  handleHover(screen: Point | undefined): void {
    if (this.core.simulations.hover(screen)) return;
    const picked = screen ? this.core.picking.pickAt(screen) : undefined;
    const link = isNavigableLink(picked?.element.link) ? picked?.element.link : undefined;
    const handle = screen ? this.core.shapeHandles.handleAt(screen) : undefined;
    const modeHandle = screen && !handle ? this.core.modeHandles.handleAt(screen)?.handle : undefined;
    const edgeEnd = screen && !handle ? this.core.edgeHandles.edgeEndAt(screen) : undefined;
    const pointHandle = screen && !handle && !edgeEnd ? this.core.edgeHandles.pointHandleAt(screen) : undefined;
    const bent = pointHandle && this.core.targets.editableEdgeSelection()?.edge;
    const cursor =
      (handle && isConnectHandle(handle)) || edgeEnd
        ? 'crosshair'
        : handle
          ? HANDLE_CURSORS[handle]
          : pointHandle && bent
            ? this.pointHandleCursor(pointHandle, bent.style)
            : link || modeHandle
              ? 'pointer'
              : '';
    if (!this.core.canvas.style.cursor.startsWith('grab')) this.core.canvas.style.cursor = cursor;
    this.core.canvas.title = modeHandle ? modeHandle.title : link ? this.core.links.describeLink(link) : '';
    this.hovered = picked;
    // Partie survolée (ex. champ d'une table RDD) : pré-sélection (sujet 259) ; flèche : sa partie liée (sujet 373).
    this.core.shapeParts.hover(
      screen,
      picked?.type === 'shape' ? (picked.element as ShapeModel) : undefined,
      picked?.type === 'edge' ? picked.element.id : undefined,
    );
    this.core.splitHover.update(picked?.type === 'edge' ? picked.element.id : undefined);
    this.syncHoverComment();
    clearTimeout(this.hoverTimer);
    if (link && this.core.settings.preload.onHover) {
      this.hoverTimer = setTimeout(() => this.core.links.preloadLink(link), this.core.settings.preload.hoverDelayMs);
    }
  }

  /**
   * Commentaire affiché au survol : celui de l'élément sous le curseur, sauf quand une sélection existe et qu'il n'en
   * fait pas partie (ticket 202). Rappelé à chaque changement de sélection.
   */
  syncHoverComment(): void {
    const picked = this.hovered;
    const selection = this.core.selection.current;
    const shown =
      picked &&
      (!selection ||
        selection.pageId !== this.core.pages.currentPageId ||
        selection.items.some((item) => item.element.id === picked.element.id));
    const own = shown ? commentOf(picked.element) : undefined;
    // Partie survolée commentée (ex. champ d'une table RDD, sujet 262) : son commentaire après celui de la forme.
    const shape = shown && picked.type === 'shape' ? (picked.element as ShapeModel) : undefined;
    const part = shape && this.core.shapeParts.hoveredPart(shape.id);
    const partComment = shape && part !== undefined && this.core.shapeParts.comment(shape, part);
    const comment = partComment ? withPartComment(own, partComment) : own;
    if (!sameComment(comment, this.hoverComment)) {
      this.hoverComment = comment;
      this.core.events.emit('commentHover', comment);
    }
  }

  /**
   * Touche C, édition activée ou non : passe en édition en place le commentaire de la forme ou de la flèche
   * sélectionnée seule, sinon, sans sélection, celui de l'élément sous le curseur (qui est alors sélectionné) ; vide
   * s'il n'en a pas (tickets 201, 202) ; dans ce second cas, la sortie de l'éditeur le désélectionne (ticket 203).
   * Faux sans l'un ni l'autre, avec plusieurs éléments sélectionnés ou sur une page non modifiable.
   */
  editHoveredComment(): boolean {
    const page = this.core.targets.writablePage()?.page;
    if (!page) return false;
    const selection = this.core.selection.current;
    if (selection?.pageId === page.id) {
      if (this.core.selection.isMultiSelection()) return false;
      // Partie sélectionnée (ex. champ, sujet 262) : son commentaire, si le mode en a un.
      if (selection.part !== undefined && this.core.shapeParts.editComment(selection.picked.element.id, selection.part))
        return true;
      return this.core.properties.editComment(selection.picked.element.id);
    }
    const picked = this.hovered;
    if (!picked) return false;
    // Partie survolée sans sélection : elle est sélectionnée pour l'occasion, son commentaire en édition.
    const part = picked.type === 'shape' ? this.core.shapeParts.hoveredPart(picked.element.id) : undefined;
    if (part !== undefined) {
      this.core.selection.selectItems([picked], part);
      if (this.core.shapeParts.editComment(picked.element.id, part, true)) return true;
      this.core.selection.select(picked);
    }
    this.core.selection.select(picked);
    return this.core.properties.editComment(picked.element.id, true);
  }
}
