import { cellLabelValue } from '../../../format/edit';
import { edgeTextLayout, endLabelOf, flipTarget } from '../../../edit/edgeLabels';
import type { EdgeEnd } from '../../../edit/edgeLabels';
import { labelPoint } from '../../../render/edges/polyline';
import { screenToPage } from '../../../interaction/camera';
import type { Point, Rect, ShapeModel } from '../../../model/types';
import { insetRect, labelMargins } from '../../../render/labelPosition';
import type { SceneLevel } from '../../../shapes/types';
import { alongAnchor } from '../../../render/textPath';
import type { LabelEditPlane, LabelEditRequest } from '../../types';
import type { EngineCore } from '../../EngineCore';

/**
 * Édition en place d'un texte (double-clic, F2) : demande à l'UI, emprise et plan à l'écran, suivi de la vue, label
 * dessiné masqué.
 */
export class LabelEditor {
  /** Texte en cours d'édition en place (son label dessiné est masqué). */
  editing?: LabelEditRequest;

  constructor(private readonly core: EngineCore) {}

  /** Demande d'édition complétée de la bascule possible (texte de début / fin en configuration par défaut). */
  withFlip(request: LabelEditRequest): LabelEditRequest {
    const edge = this.core.pages.getCurrentPage()?.edges.find((e) => e.id === request.elementId);
    const route = this.core.sceneView.sceneObject(request.elementId)?.userData.route as Point[] | undefined;
    const rest = { ...request };
    delete rest.flip;
    if (!request.onEdge || !request.end || !edge || !route?.length) return rest;
    const child = request.labelCellId ? edge.labels.find((l) => l.id === request.labelCellId) : undefined;
    const placement =
      child?.placement ??
      edgeTextLayout(route, request.end, request.flipped, this.core.edgeTexts.endTextGap()).placement;
    const target = flipTarget(
      route,
      request.end,
      placement,
      child?.style ?? request.style,
      this.core.edgeTexts.endTextGap(),
    );
    return target ? { ...rest, flip: target.direction } : rest;
  }

  /**
   * Angle de l'éditeur d'un texte du milieu qui suit sa flèche : celui du trait dessiné au point du texte, à l'écran.
   */
  withAngle(request: LabelEditRequest): LabelEditRequest {
    const rest = { ...request };
    delete rest.angle;
    const along =
      !request.onEdge || request.end || request.labelCellId
        ? undefined
        : this.core.edgeTexts.followedText(request.elementId);
    if (!along) return rest;
    const { point, tangent } = alongAnchor(along);
    const top = this.core.sceneView.elementTop(request.elementId);
    const from = this.core.picking.screenOfPoint(point, top);
    const to = this.core.picking.screenOfPoint({ x: point.x + tangent.x * 10, y: point.y + tangent.y * 10 }, top);
    let angle = Math.atan2(to.y - from.y, to.x - from.x);
    // Jamais à l'envers, comme le texte dessiné.
    if (angle > Math.PI / 2 + 1e-9) angle -= Math.PI;
    else if (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI;
    return Math.abs(angle) < 1e-9 ? rest : { ...rest, angle };
  }

  editLabel(elementId?: string): void {
    const editable = this.core.targets.editablePage();
    const id = elementId ?? this.core.selection.current?.picked.element.id;
    const element =
      editable && id ? [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === id) : undefined;
    if (!editable || !element || !editable.pageTree.cells.get(element.id)?.cell) return;
    const rect = this.labelEditScreen(element.id);
    if (!rect) return;
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: element.id,
      text: element.label,
      screen: rect,
      plane: this.labelEditPlane(element.id),
      styleCellId: element.id,
      style: element.style,
      html: element.style.html === '1' ? cellLabelValue(editable.pageTree, element.id) : undefined,
      scale: this.textScale(element.id),
      onEdge: editable.page.edges.some((e) => e.id === element.id),
      ...this.labelEditBackdrop(
        element.style,
        editable.page.edges.some((e) => e.id === element.id),
      ),
    });
  }

  editEdgeEndLabel(edgeId: string, end: EdgeEnd): void {
    const editable = this.core.targets.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    const current = edge && endLabelOf(edge, end);
    const screen = this.labelEditScreen(edgeId, end, current?.id);
    if (!editable || !edge || !screen) return;
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: edgeId,
      end,
      labelCellId: current?.id,
      text: current?.label ?? '',
      screen,
      styleCellId: current?.id,
      // Texte à créer : avec la configuration qu'il aura (taille, couleur, alignement).
      style: current?.style ?? {
        ...edge.style,
        ...this.core.edgeTexts.endTextStyle(this.core.edgeTexts.endTextLayout(edgeId, end)),
      },
      html: current?.style.html === '1' ? cellLabelValue(editable.pageTree, current.id) : undefined,
      scale: this.textScale(edgeId),
      onEdge: true,
      ...this.labelEditBackdrop(current?.style ?? edge.style, true),
    });
  }

  /**
   * Fond et halo du texte édité, comme le label dessiné : une forme a le fond de `labelBackgroundColor`
   * (`default` = la page) ; une flèche n'a de fond que s'il est explicite, sinon un halo autour des lettres.
   */
  labelEditBackdrop(
    style: Record<string, string>,
    onEdge: boolean,
  ): Pick<LabelEditRequest, 'background' | 'halo' | 'haloWidth' | 'haloBlur'> {
    const value = style.labelBackgroundColor?.trim().toLowerCase();
    if (value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return { background: value };
    const page = this.core.settings.background.color;
    if (onEdge) {
      const backdrop = this.core.settings.shapes.edgeLabelBackdrop;
      return backdrop === 'halo'
        ? {
            halo: page,
            haloWidth: this.core.settings.shapes.edgeLabelHaloWidth,
            haloBlur: this.core.settings.shapes.edgeLabelHaloBlur,
          }
        : backdrop === 'solid'
          ? { background: page }
          : {};
    }
    return value === 'default' ? { background: page } : {};
  }

  /**
   * Édition en place : le label dessiné de la cellule est masqué (l'éditeur de l'UI le remplace, au même
   * endroit et dans le même format) jusqu'à `closeLabelEdit`.
   */
  startLabelEdit(request: LabelEditRequest): void {
    this.closeLabelEdit();
    this.editing = this.withAngle(this.withFlip(request));
    this.hideEditedLabel();
    this.core.highlight.update();
    this.core.events.emit('labelEdit', this.editing);
  }

  /**
   * Emprise à l'écran du texte édité : la zone de texte d'une forme (dessus du volume), le milieu d'une
   * flèche, ou le point de son texte de début / fin.
   */
  labelEditScreen(elementId: string, end?: EdgeEnd, labelCellId?: string, flipped = false): Rect | undefined {
    const edge = this.core.pages.getCurrentPage()?.edges.find((e) => e.id === elementId);
    if (!edge) {
      // Forme : sa zone de texte, celle où le label est dessiné à ce niveau de rendu.
      const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === elementId);
      const level = this.core.scenes.current?.level ?? 'flat';
      return shape
        ? this.core.picking.screenRectOf(
            elementId,
            this.labelEditZone(shape, level),
            this.core.sceneView.labelTop(shape),
          )
        : undefined;
    }
    // Flèche : le point où le texte est dessiné (son label, un label enfant, ou un début / fin à créer).
    const route = this.core.sceneView.sceneObject(elementId)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    const child = labelCellId ? edge.labels.find((l) => l.id === labelCellId) : undefined;
    const placement =
      child?.placement ??
      (end ? edgeTextLayout(route, end, flipped, this.core.edgeTexts.endTextGap()).placement : edge.labelPlacement);
    // Texte du milieu qui suit la flèche : son point le long du trait dessiné (glissement compris).
    const along = !child && !end ? this.core.edgeTexts.followedText(elementId) : undefined;
    const point = along ? alongAnchor(along).point : labelPoint(route, placement);
    const center = this.core.picking.screenOfPoint(point, this.core.sceneView.elementTop(elementId));
    return { x: center.x, y: center.y, width: 0, height: 0 };
  }

  /**
   * Cadre de l'éditeur en place d'une forme : sa zone de texte à ce niveau de rendu, réduite des marges propres au
   * style (`spacingLeft`…), comme sur toutes les formes (la BDD sous son ellipse, le process étiqueté hors de sa
   * tranche) ; les marges communes restent à l'intérieur du cadre.
   */
  private labelEditZone(shape: ShapeModel, level: SceneLevel): Rect {
    return insetRect(this.core.registry.textZone(shape, level), labelMargins(shape.style));
  }

  /**
   * Plan du texte d'une forme vue de biais ou tournée : sa zone de texte et ses coins projetés à l'écran,
   * à la hauteur où le label est dessiné. Vue de dessus non tournée : undefined (rectangle `screen`).
   */
  private labelEditPlane(elementId: string): LabelEditPlane | undefined {
    const { tilt, rotation, fov } = this.core.camera.state;
    if (tilt === 0 && rotation === 0 && fov === undefined) return undefined;
    const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === elementId);
    if (!shape) return undefined;
    const { x, y, width, height } = this.labelEditZone(shape, this.core.scenes.current?.level ?? 'flat');
    const top = this.core.sceneView.labelTop(shape);
    const at = (px: number, py: number) => this.core.picking.screenOfPoint({ x: px, y: py }, top);
    return {
      width,
      height,
      corners: [at(x, y), at(x + width, y), at(x + width, y + height), at(x, y + height)],
    };
  }

  /**
   * La vue a bougé ou changé de taille (panneau latéral, fenêtre) pendant une édition en place :
   * l'éditeur suit l'élément (nouvelle emprise et taille du texte).
   */
  relocateLabelEdit(): void {
    const editing = this.editing;
    if (!editing || editing.pageId !== this.core.pages.currentPageId) return;
    const screen = this.labelEditScreen(editing.elementId, editing.end, editing.labelCellId, editing.flipped);
    if (!screen) return;
    const scale = this.textScale(editing.elementId);
    // La bascule disparaît dès que le texte est placé à la main (glisser de sa poignée).
    const plane = editing.onEdge ? undefined : this.labelEditPlane(editing.elementId);
    const next = this.withAngle(this.withFlip({ ...editing, screen, scale, plane }));
    const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const samePlane = JSON.stringify(plane) === JSON.stringify(editing.plane);
    if (
      same(screen, editing.screen) &&
      samePlane &&
      scale === editing.scale &&
      next.flip === editing.flip &&
      next.angle === editing.angle
    )
      return;
    this.editing = next;
    this.core.events.emit('labelEdit', this.editing);
  }

  closeLabelEdit(): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = undefined;
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = true));
    this.core.highlight.update();
  }

  hideEditedLabel(): void {
    const editing = this.editing;
    if (!editing || editing.pageId !== this.core.pages.currentPageId) return;
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = false));
    this.core.rendering.requestRender();
  }

  /** Pixels écran par pixel de page au niveau d'un élément (taille du texte de l'éditeur en place). */
  textScale(elementId: string): number {
    if (this.core.camera.state.mode !== '3d') return this.core.camera.state.zoom;
    const rect = this.core.picking.screenRectOf(elementId);
    const top = this.core.sceneView.elementTop(elementId);
    const center = rect
      ? screenToPage(this.core.camera.state, this.core.display.viewport, {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        })
      : { x: 0, y: 0 };
    const at = this.core.picking.screenOfPoint(center, top);
    const dx = this.core.picking.screenOfPoint({ x: center.x + 10, y: center.y }, top);
    const dy = this.core.picking.screenOfPoint({ x: center.x, y: center.y + 10 }, top);
    return Math.max(Math.hypot(dx.x - at.x, dx.y - at.y), Math.hypot(dy.x - at.x, dy.y - at.y)) / 10;
  }
}
