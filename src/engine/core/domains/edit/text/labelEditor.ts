import { cellLabelValue } from '../../../format/cellEdits';
import { edgeTextLayout, endLabelOf, flipTarget } from '../../../edit/edgeLabels';
import type { EdgeEnd } from '../../../edit/edgeLabels';
import { labelPoint } from '../../../render/edges/polyline';
import { dragGround, revealShift, screenToPage } from '../../../interaction/cameraMath';
import type { CameraState } from '../../../interaction/cameraMath';
import type { Point, Rect, ShapeModel } from '../../../model/types';
import { insetRect, labelMargins } from '../../../render/labelPosition';
import type { SceneLevel } from '../../../shapes/types';
import { alongAnchor } from '../../../render/textPath';
import type { LabelEditPlane, LabelEditRequest } from '../../types';
import type { EngineCore } from '../../EngineCore';
import { boundsOfPoints, distance, unionOf } from '../../../model/geometry';
import { styleFlag } from '../../../model/styleValues';
import type { ReadonlyShapeModel } from '../../../model/readonly';

/** Marge (px écran) laissée au bord du canvas quand la vue glisse pour montrer le texte édité (ticket 240). */
const REVEAL_MARGIN = 20;
/** Durée du glissement de la vue à l'entrée en édition. */
const REVEAL_MS = 200;
/** Emprise prise pour un texte de flèche (son point seul est connu), comme `Picking.screenRectOf`. */
const EDGE_TEXT_BOX = { width: 120, height: 32 };

/**
 * Édition en place d'un texte (double-clic, F2) : demande à l'UI, emprise et plan à l'écran, suivi de la vue, label
 * dessiné masqué.
 */
export class LabelEditor {
  /** Texte en cours d'édition en place (son label dessiné est masqué). */
  editing?: LabelEditRequest;
  /** Nom d'origine d'une forme dont le texte saisi est montré en direct (`previewLabel`), à rétablir à la fermeture. */
  private previewed?: { pageId: string; shapeId: string; label: string };
  /** Forme dessinée avec le texte saisi d'une de ses parties (sujet 253), en attendant la validation. */
  private partPreview?: ReadonlyShapeModel;
  /** Dernière demande d'édition : une ouverture différée (vue qui glisse) ne vaut que si aucune autre n'a suivi. */
  private startToken = 0;

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

  /** Champ en cours d'édition modifié (format, côté du texte…) : l'UI le reçoit par `labelEdit`. */
  updateEditing(request: LabelEditRequest): void {
    this.editing = request;
    this.core.events.emit('labelEdit', request);
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
    const displayStyle = this.displayStyle(element.id, element.style);
    const plain = 'kind' in element && this.core.registry.isPlainText(element);
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: element.id,
      text: element.label,
      ...(plain && { plain }),
      screen: rect,
      plane: this.labelEditPlane(element.id),
      styleCellId: element.id,
      style: element.style,
      displayStyle,
      html: !plain && styleFlag(element.style, 'html') ? cellLabelValue(editable.pageTree, element.id) : undefined,
      scale: this.textScale(element.id),
      onEdge: editable.page.edges.some((e) => e.id === element.id),
      // Fond de l'éditeur : celui du texte affiché (une forme qui place elle-même son label peut l'ôter).
      ...this.labelEditBackdrop(
        displayStyle ?? element.style,
        editable.page.edges.some((e) => e.id === element.id),
      ),
    });
  }

  /**
   * Texte d'une partie d'une forme (ex. label d'un champ d'une table RDD, sujet 249) : éditeur sur une ligne, au cadre
   * donné par le mode, sur fond blanc (il couvre le texte dessiné) ; sans format du texte. Validé par `setPartText`.
   */
  editPartLabel(shapeId: string, part: string): void {
    const editable = this.core.targets.editablePage();
    const text = this.core.shapeParts.text(shapeId, part);
    const screen = this.partScreen(shapeId, part);
    if (!editable || !text || !screen) return;
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: shapeId,
      part,
      singleLine: true,
      plain: true,
      text: text.text,
      screen,
      style: {
        fontSize: String(text.fontSize),
        fontColor: text.color ?? '#000000',
        fontStyle: text.italic ? '2' : '0',
        align: text.center ? 'center' : 'left',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      },
      scale: this.textScale(shapeId),
      onEdge: false,
      ...(!text.transparent && { background: '#ffffff' }),
    });
  }

  /** Cadre à l'écran du texte d'une partie (sujet 249), sur la forme telle qu'elle est dessinée (aperçu compris). */
  private partScreen(shapeId: string, part: string): Rect | undefined {
    const shape = this.partPreview ?? this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === shapeId);
    const text = this.core.shapeParts.text(shapeId, part, shape);
    return text && shape
      ? this.core.picking.screenRectOf(shapeId, text.zone, this.core.sceneView.labelTop(shape))
      : undefined;
  }

  editEdgeEndLabel(edgeId: string, end: EdgeEnd): void {
    // Textes de bout d'une flèche gérée par le mode (cardinalités d'une relation RDD) : imposés.
    if (this.core.pageModes.managesEdge(edgeId)) return;
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
      html: current && styleFlag(current.style, 'html') ? cellLabelValue(editable.pageTree, current.id) : undefined,
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
    const token = ++this.startToken;
    const target = this.revealTarget(request);
    if (!target) {
      this.openLabelEdit(request);
      return;
    }
    // La vue glisse d'abord ; l'éditeur s'ouvre à l'arrivée, à la nouvelle emprise du texte (`relocateLabelEdit`).
    this.core.camera.animateCameraTo(target, REVEAL_MS, false, () => {
      if (token !== this.startToken || this.editing) return;
      this.openLabelEdit(request);
      this.relocateLabelEdit();
    });
  }

  private openLabelEdit(request: LabelEditRequest): void {
    this.editing = this.withAngle(this.withFlip(request));
    this.hideEditedLabel();
    this.core.highlight.update();
    this.core.events.emit('labelEdit', this.editing);
  }

  /**
   * Forme (ou texte de flèche) coupé par le bord du canvas : vue qui la montre en entier, déplacée (translation
   * seule) juste assez ; undefined si elle est déjà entièrement visible.
   */
  private revealTarget(request: LabelEditRequest): CameraState | undefined {
    // Forme : toute la forme à l'écran, pas seulement sa zone de texte (plus petite que la forme).
    const text = request.plane
      ? boundsOfPoints(request.plane.corners)
      : request.screen.width === 0 && request.screen.height === 0
        ? {
            x: request.screen.x - EDGE_TEXT_BOX.width / 2,
            y: request.screen.y - EDGE_TEXT_BOX.height / 2,
            ...EDGE_TEXT_BOX,
          }
        : request.screen;
    const shape = request.onEdge ? undefined : this.core.picking.screenRectOf(request.elementId);
    const box = unionOf([text, shape].filter((rect): rect is Rect => rect !== undefined));
    if (!box) return undefined;
    const viewport = this.core.display.viewport;
    const shift = revealShift(box, viewport, REVEAL_MARGIN);
    if (shift.x === 0 && shift.y === 0) return undefined;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const to = { x: from.x + shift.x, y: from.y + shift.y };
    return dragGround(this.core.camera.state, viewport, from, to);
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
      // Texte sur la pancarte d'une silhouette debout : le cadre du panneau à l'écran.
      const sign = this.signPlane(elementId);
      if (sign) {
        const xs = sign.corners.map((p) => p.x);
        const ys = sign.corners.map((p) => p.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
      }
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
    const sign = this.signPlane(elementId);
    if (sign) return sign;
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
    const screen =
      editing.part !== undefined
        ? this.partScreen(editing.elementId, editing.part)
        : this.labelEditScreen(editing.elementId, editing.end, editing.labelCellId, editing.flipped);
    if (!screen) return;
    const scale = this.textScale(editing.elementId);
    // La bascule disparaît dès que le texte est placé à la main (glisser de sa poignée).
    const own = editing.onEdge || editing.part !== undefined;
    const plane = own ? undefined : this.labelEditPlane(editing.elementId);
    // Texte sur une pancarte : l'éditeur suit le format de la cellule (changé pendant l'édition), centré et ajusté.
    const displayStyle = own ? undefined : this.displayStyle(editing.elementId, editing.style);
    const next = this.withAngle(this.withFlip({ ...editing, screen, scale, plane, displayStyle }));
    const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const samePlane = JSON.stringify(plane) === JSON.stringify(editing.plane);
    if (
      same(screen, editing.screen) &&
      samePlane &&
      JSON.stringify(displayStyle) === JSON.stringify(editing.displayStyle) &&
      scale === editing.scale &&
      next.flip === editing.flip &&
      next.angle === editing.angle
    )
      return;
    this.editing = next;
    this.core.events.emit('labelEdit', this.editing);
  }

  /**
   * Texte en cours de saisie d'une forme qui place elle-même son label (`editStyle`, ex. onglet d'une région RDD) :
   * la forme est redessinée en direct avec lui (modèle seul, rien n'est écrit) et l'éditeur suit sa zone de texte.
   */
  previewLabel(text: string): void {
    const editing = this.editing;
    // Partie d'une forme (sujet 253) : la forme redessinée avec ce texte, son texte dessiné masqué.
    if (editing?.part !== undefined) {
      const preview = this.core.shapeParts.textPreview(editing.elementId, editing.part, text);
      if (!preview) return;
      this.partPreview = preview;
      this.core.live.rebuildShapeObject(preview);
      this.hideEditedLabel();
      this.core.live.afterLiveEdit();
      this.relocateLabelEdit();
      return;
    }
    const page = this.core.pages.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === editing?.elementId);
    if (!editing || editing.onEdge || !page || page.id !== editing.pageId || !shape) return;
    if (!this.core.registry.editStyle(shape) || shape.label === text) return;
    this.previewed ??= { pageId: page.id, shapeId: shape.id, label: shape.label };
    shape.label = text;
    this.core.live.rebuildShapeObject(shape);
    this.hideEditedLabel();
    this.core.live.afterLiveEdit();
    this.relocateLabelEdit();
  }

  closeLabelEdit(): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = undefined;
    // Aperçu de la saisie : le nom d'origine revient (une validation l'écrit ensuite et relit la page).
    const previewed = this.previewed;
    this.previewed = undefined;
    const shape =
      previewed && this.core.pages.pageById(previewed.pageId)?.shapes.find((s) => s.id === previewed.shapeId);
    if (shape && previewed) {
      shape.label = previewed.label;
      if (this.core.pages.currentPageId === previewed.pageId) {
        this.core.live.rebuildShapeObject(shape);
        this.core.live.afterLiveEdit();
      }
    }
    // Aperçu d'une partie : la forme reprend son dessin (une validation l'écrit ensuite et relit la page).
    if (this.partPreview) {
      this.partPreview = undefined;
      const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === editing.elementId);
      if (shape && editing.pageId === this.core.pages.currentPageId) {
        this.core.live.rebuildShapeObject(shape);
        this.core.live.afterLiveEdit();
      }
    }
    if (editing.part !== undefined)
      this.core.shapeParts.textObjects(editing.elementId, editing.part).forEach((object) => (object.visible = true));
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = true));
    this.core.highlight.update();
  }

  hideEditedLabel(): void {
    const editing = this.editing;
    if (!editing || editing.pageId !== this.core.pages.currentPageId) return;
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = false));
    if (editing.part !== undefined)
      this.core.shapeParts.textObjects(editing.elementId, editing.part).forEach((object) => (object.visible = false));
    this.core.rendering.requestRender();
  }

  /**
   * Pancarte d'une silhouette debout (Actor en iso / 3D) : cadre du panneau et ses coins à l'écran, dans le sens de
   * lecture du texte (haut gauche, haut droit, bas droit, bas gauche). `undefined` sans pancarte.
   */
  private signPlane(elementId: string): LabelEditPlane | undefined {
    const standing = this.core.picking.standingPlane(elementId);
    const sign = standing?.figure.sign;
    if (!standing || !sign) return undefined;
    // L'axe x de la silhouette va vers la gauche de l'écran (texte du panneau en repère retourné).
    const right = sign.x;
    const left = sign.x + sign.width;
    const top = sign.y + sign.height;
    const bottom = sign.y;
    const at = (x: number, y: number) => {
      const { x: sx, y: sy } = standing.toScreen({ x, y });
      return { x: sx, y: sy };
    };
    return {
      width: sign.width,
      height: sign.height,
      corners: [at(left, top), at(right, top), at(right, bottom), at(left, bottom)],
    };
  }

  /**
   * Style d'affichage de l'éditeur : celui du texte sur la pancarte d'une silhouette debout, sinon celui que la forme
   * donne à son éditeur (`editStyle`, ex. nom d'une région RDD) ; undefined = le style de l'élément.
   */
  private displayStyle(elementId: string, style: Record<string, string>): Record<string, string> | undefined {
    const sign = this.signLabelStyle(elementId);
    if (sign) return sign(style);
    const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === elementId);
    return shape && this.core.registry.editStyle({ ...shape, style });
  }

  /** Style du texte sur la pancarte d'une silhouette debout (centré, ajusté), s'il y en a une. */
  private signLabelStyle(elementId: string): ((style: Record<string, string>) => Record<string, string>) | undefined {
    const figure = this.core.picking.standingPlane(elementId)?.figure;
    return figure?.sign ? figure.signLabelStyle : undefined;
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
    return Math.max(distance(at, dx), distance(at, dy)) / 10;
  }
}
