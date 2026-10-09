import { cellLabelValue } from '../../../format/cellEdits';
import { endLabelOf } from '../../../edit/edgeLabels';
import type { EdgeEnd } from '../../../edit/edgeLabels';
import type { Point, Rect } from '../../../model/types';
import type { LabelEditRequest } from '../../types';
import type { EngineCore } from '../../EngineCore';
import { sameRect } from '../../../model/geometry';
import { styleFlag } from '../../../model/styleValues';
import { labelBackdropOf, labelBackdropSettings } from '../../../render/styleColors';
import { shapeTarget } from '../../../modes/modeTargets';
import { edgeOf, elementOf, shapeOf } from '../../../model/pageIndex';
import {
  flipDirection,
  followedTextAngle,
  labelEditPlane,
  labelEditScreen,
  revealTarget,
  textScale,
} from './labelEditGeometry';
import type { LabelEditView } from './labelEditGeometry';
import { LabelEditPreview } from './labelEditPreview';

/** Durée du glissement de la vue à l'entrée en édition. */
const REVEAL_MS = 200;

/**
 * Édition en place d'un texte (double-clic, F2) : demande à l'UI, suivi de la vue, aperçu de la saisie, label dessiné
 * masqué. Emprise et plan à l'écran : `labelEditGeometry.ts`.
 */
export class LabelEditor {
  /** Texte en cours d'édition en place (son label dessiné est masqué). */
  private editRequest: LabelEditRequest | undefined;
  /** Aperçu de la saisie (`previewLabel`), rétabli à la fermeture. */
  private readonly preview: LabelEditPreview;
  /** Dernière demande d'édition : une ouverture différée (vue qui glisse) ne vaut que si aucune autre n'a suivi. */
  private startToken = 0;
  /** Vue lue par la géométrie de l'éditeur, toujours à jour (accesseurs sur le cœur). */
  private readonly view: LabelEditView;

  constructor(private readonly core: EngineCore) {
    this.preview = new LabelEditPreview(core);
    this.view = {
      get page() {
        return core.pages.getCurrentPage();
      },
      get level() {
        return core.scenes.current?.level ?? 'flat';
      },
      get camera() {
        return core.camera.state;
      },
      get viewport() {
        return core.display.viewport;
      },
      get projection() {
        return core.projection;
      },
      route: (edgeId) => core.sceneView.sceneObject(edgeId)?.userData.route as Point[] | undefined,
      elementTop: (elementId) => core.sceneView.elementTop(elementId),
      labelTop: (shape) => core.sceneView.labelTop(shape),
      textZone: (shape, level) => core.registry.textZone(shape, level),
      followedText: (edgeId) => core.edgeTexts.followedText(edgeId),
      endTextGap: () => core.edgeTexts.endTextGap(),
    };
  }

  /** Texte en cours d'édition en place (lecture seule pour les autres domaines). */
  get editing(): LabelEditRequest | undefined {
    return this.editRequest;
  }

  /** Demande d'édition complétée de la bascule possible (texte de début / fin en configuration par défaut). */
  withFlip(request: LabelEditRequest): LabelEditRequest {
    const rest = { ...request };
    delete rest.flip;
    const flip = flipDirection(this.view, request);
    return flip ? { ...rest, flip } : rest;
  }

  /** Champ en cours d'édition modifié (format, côté du texte…) : l'UI le reçoit par `labelEdit`. */
  updateEditing(request: LabelEditRequest): void {
    this.editRequest = request;
    this.core.events.emit('labelEdit', request);
  }

  /**
   * Angle de l'éditeur d'un texte du milieu qui suit sa flèche : celui du trait dessiné au point du texte, à l'écran.
   */
  withAngle(request: LabelEditRequest): LabelEditRequest {
    const rest = { ...request };
    delete rest.angle;
    const followed = request.onEdge && !request.end && !request.labelCellId;
    const angle = followed ? followedTextAngle(this.view, request.elementId) : undefined;
    return angle === undefined ? rest : { ...rest, angle };
  }

  editLabel(elementId?: string): void {
    const editable = this.core.targets.editablePage();
    const id = elementId ?? this.core.selection.current?.picked.element.id;
    const element = editable && id ? elementOf(editable.page, id) : undefined;
    if (!editable || !element || !editable.pageTree.cells.get(element.id)?.cell) return;
    const rect = this.labelEditScreen(element.id);
    if (!rect) return;
    const displayStyle = this.displayStyle(element.id, element.style);
    const shape = shapeTarget(element);
    const plain = !!shape && this.core.registry.isPlainText(shape);
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: element.id,
      text: element.label,
      ...(plain && { plain }),
      screen: rect,
      plane: labelEditPlane(this.view, element.id),
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
   * `multiline` (sujet 331) : plusieurs lignes, texte en haut à gauche sans retour automatique ; `monospace` : police
   * de code.
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
      ...(!text.multiline && { singleLine: true }),
      plain: true,
      text: text.text,
      screen,
      style: {
        fontSize: String(text.fontSize),
        fontColor: text.color ?? '#000000',
        fontStyle: text.italic ? '2' : '0',
        align: text.center ? 'center' : 'left',
        verticalAlign: text.multiline ? 'top' : 'middle',
        whiteSpace: 'nowrap',
        ...(text.monospace && { fontFamily: 'Courier New' }),
      },
      scale: this.textScale(shapeId),
      onEdge: false,
      ...(!text.transparent && { background: '#ffffff' }),
    });
  }

  /** Cadre à l'écran du texte d'une partie (sujet 249), sur la forme telle qu'elle est dessinée (aperçu compris). */
  private partScreen(shapeId: string, part: string): Rect | undefined {
    const shape = this.preview.partShape() ?? shapeOf(this.core.pages.getCurrentPage(), shapeId);
    const text = this.core.shapeParts.text(shapeId, part, shape);
    return text && shape
      ? this.core.projection.screenRectOf(shapeId, text.zone, this.core.sceneView.labelTop(shape))
      : undefined;
  }

  editEdgeEndLabel(edgeId: string, end: EdgeEnd): void {
    // Textes de bout d'une flèche gérée par le mode (cardinalités d'une relation RDD) : imposés.
    if (this.core.pageModes.managesEdge(edgeId)) return;
    const editable = this.core.targets.editablePage();
    const edge = edgeOf(editable?.page, edgeId);
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

  /** Fond et halo du texte édité, comme le label dessiné (`labelBackdropOf`). */
  labelEditBackdrop(
    style: Record<string, string>,
    onEdge: boolean,
  ): Pick<LabelEditRequest, 'background' | 'halo' | 'haloWidth' | 'haloBlur'> {
    const { settings } = this.core;
    const { background, halo } = labelBackdropOf(
      style,
      onEdge,
      labelBackdropSettings(settings.shapes),
      settings.background.color,
    );
    if (halo) return { halo: halo.color, haloWidth: halo.width, haloBlur: halo.blur };
    return background ? { background } : {};
  }

  /**
   * Édition en place : le label dessiné de la cellule est masqué (l'éditeur de l'UI le remplace, au même
   * endroit et dans le même format) jusqu'à `closeLabelEdit`.
   */
  startLabelEdit(request: LabelEditRequest): void {
    this.closeLabelEdit();
    const token = ++this.startToken;
    const target = revealTarget(this.view, request);
    if (!target) {
      this.openLabelEdit(request);
      return;
    }
    // La vue glisse d'abord ; l'éditeur s'ouvre à l'arrivée, à la nouvelle emprise du texte (`relocateLabelEdit`).
    this.core.camera.animateCameraTo(target, REVEAL_MS, false, () => {
      if (token !== this.startToken || this.editRequest) return;
      this.openLabelEdit(request);
      this.relocateLabelEdit();
    });
  }

  private openLabelEdit(request: LabelEditRequest): void {
    this.editRequest = this.withAngle(this.withFlip(request));
    this.hideEditedLabel();
    this.core.highlight.update();
    this.core.events.emit('labelEdit', this.editRequest);
  }

  /** Emprise à l'écran du texte édité (`labelEditGeometry.labelEditScreen`). */
  labelEditScreen(elementId: string, end?: EdgeEnd, labelCellId?: string, flipped = false): Rect | undefined {
    return labelEditScreen(this.view, elementId, end, labelCellId, flipped);
  }

  /** Pixels écran par pixel de page au niveau d'un élément (taille du texte de l'éditeur en place). */
  textScale(elementId: string): number {
    return textScale(this.view, elementId);
  }

  /**
   * La vue a bougé ou changé de taille (panneau latéral, fenêtre) pendant une édition en place :
   * l'éditeur suit l'élément (nouvelle emprise et taille du texte).
   */
  relocateLabelEdit(): void {
    const editing = this.editRequest;
    if (!editing || editing.pageId !== this.core.pages.currentPageId) return;
    const screen =
      editing.part !== undefined
        ? this.partScreen(editing.elementId, editing.part)
        : this.labelEditScreen(editing.elementId, editing.end, editing.labelCellId, editing.flipped);
    if (!screen) return;
    const scale = this.textScale(editing.elementId);
    // La bascule disparaît dès que le texte est placé à la main (glisser de sa poignée).
    const own = editing.onEdge || editing.part !== undefined;
    const plane = own ? undefined : labelEditPlane(this.view, editing.elementId);
    // Texte sur une pancarte : l'éditeur suit le format de la cellule (changé pendant l'édition), centré et ajusté.
    const displayStyle = own ? undefined : this.displayStyle(editing.elementId, editing.style);
    const next = this.withAngle(this.withFlip({ ...editing, screen, scale, plane, displayStyle }));
    const samePlane = JSON.stringify(plane) === JSON.stringify(editing.plane);
    if (
      sameRect(screen, editing.screen) &&
      samePlane &&
      JSON.stringify(displayStyle) === JSON.stringify(editing.displayStyle) &&
      scale === editing.scale &&
      next.flip === editing.flip &&
      next.angle === editing.angle
    )
      return;
    this.editRequest = next;
    this.core.events.emit('labelEdit', this.editRequest);
  }

  /**
   * Texte en cours de saisie d'une partie ou d'une forme qui place elle-même son label (`LabelEditPreview`) : la forme
   * est redessinée en direct avec lui (rien n'est écrit) et l'éditeur suit sa zone de texte.
   */
  previewLabel(text: string): void {
    if (!this.preview.show(this.editRequest, text)) return;
    // Forme redessinée : son texte dessiné (ou celui de la partie) reste masqué.
    this.hideEditedLabel();
    this.core.live.afterLiveEdit();
    this.relocateLabelEdit();
  }

  closeLabelEdit(): void {
    const editing = this.editRequest;
    if (!editing) return;
    this.editRequest = undefined;
    this.preview.restore(editing);
    if (editing.part !== undefined)
      this.core.shapeParts.textObjects(editing.elementId, editing.part).forEach((object) => (object.visible = true));
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = true));
    this.core.highlight.update();
  }

  hideEditedLabel(): void {
    const editing = this.editRequest;
    if (!editing || editing.pageId !== this.core.pages.currentPageId) return;
    this.core.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = false));
    if (editing.part !== undefined)
      this.core.shapeParts.textObjects(editing.elementId, editing.part).forEach((object) => (object.visible = false));
    this.core.rendering.requestRender();
  }

  /**
   * Style d'affichage de l'éditeur : celui du texte sur la pancarte d'une silhouette debout, sinon celui que la forme
   * donne à son éditeur (`editStyle`, ex. nom d'une région RDD) ; undefined = le style de l'élément.
   */
  private displayStyle(elementId: string, style: Record<string, string>): Record<string, string> | undefined {
    const sign = this.signLabelStyle(elementId);
    if (sign) return sign(style);
    const shape = shapeOf(this.core.pages.getCurrentPage(), elementId);
    return shape && this.core.registry.editStyle({ ...shape, style });
  }

  /** Style du texte sur la pancarte d'une silhouette debout (centré, ajusté), s'il y en a une. */
  private signLabelStyle(elementId: string): ((style: Record<string, string>) => Record<string, string>) | undefined {
    const figure = this.core.projection.standingPlane(elementId)?.figure;
    return figure?.sign ? figure.signLabelStyle : undefined;
  }
}
