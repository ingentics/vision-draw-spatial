import { edgeTextLayout, flipTarget } from '../../../edit/edgeLabels';
import type { EdgeEnd, EndTextGap } from '../../../edit/edgeLabels';
import { labelPoint } from '../../../render/edges/polyline';
import { dragGround, revealShift, screenToPage } from '../../../interaction/cameraMath';
import type { CameraState, Viewport } from '../../../interaction/cameraMath';
import type { PageModel, Point, Rect, ShapeModel } from '../../../model/types';
import { insetRect, labelMargins } from '../../../render/labelPosition';
import type { SceneLevel } from '../../../shapes/types';
import { alongAnchor } from '../../../render/textPath';
import type { TextAlong } from '../../../render/textPath';
import type { LabelEditPlane, LabelEditRequest } from '../../types';
import type { ScreenProjection } from '../../view/projection';
import { EDGE_TEXT_BOX } from '../../view/projection';
import { boundsOfPoints, center, distance, rectPath, unionOf } from '../../../model/geometry';
import { byId, edgeOf, shapeOf } from '../../../model/pageIndex';

/**
 * Géométrie à l'écran de l'éditeur de texte en place (emprise, plan, échelle, angle, glissement de la vue) : fonctions
 * sans état, sur ce que la vue montre (`LabelEditView`).
 */

/** Marge (px écran) laissée au bord du canvas quand la vue glisse pour montrer le texte édité (ticket 240). */
const REVEAL_MARGIN = 20;

/** Ce que la géométrie de l'éditeur lit de la vue : page courante, caméra, projection, scène dessinée. */
export interface LabelEditView {
  readonly page: PageModel | undefined;
  /** Niveau de rendu de la scène courante. */
  readonly level: SceneLevel;
  readonly camera: CameraState;
  readonly viewport: Viewport;
  readonly projection: Pick<ScreenProjection, 'screenOfPoint' | 'screenRectOf' | 'standingPlane'>;
  /** Tracé dessiné d'une flèche. */
  route(edgeId: string): Point[] | undefined;
  elementTop(elementId: string): number;
  /** Hauteur où le label d'une forme est dessiné. */
  labelTop(shape: ShapeModel): number;
  textZone(shape: ShapeModel, level: SceneLevel): Rect;
  /** Texte du milieu qui suit le trait dessiné d'une flèche. */
  followedText(edgeId: string): TextAlong | undefined;
  endTextGap(): EndTextGap;
}

/**
 * Emprise à l'écran du texte édité : la zone de texte d'une forme (dessus du volume), le milieu d'une
 * flèche, ou le point de son texte de début / fin.
 */
export function labelEditScreen(
  view: LabelEditView,
  elementId: string,
  end?: EdgeEnd,
  labelCellId?: string,
  flipped = false,
): Rect | undefined {
  const edge = edgeOf(view.page, elementId);
  if (!edge) {
    // Forme : sa zone de texte, celle où le label est dessiné à ce niveau de rendu.
    const shape = shapeOf(view.page, elementId);
    // Texte sur la pancarte d'une silhouette debout : le cadre du panneau à l'écran.
    const sign = signPlane(view, elementId);
    if (sign) {
      return boundsOfPoints(sign.corners);
    }
    return shape
      ? view.projection.screenRectOf(elementId, labelEditZone(view, shape), view.labelTop(shape))
      : undefined;
  }
  // Flèche : le point où le texte est dessiné (son label, un label enfant, ou un début / fin à créer).
  const route = view.route(elementId);
  if (!route?.length) return undefined;
  const child = labelCellId ? byId(edge.labels, labelCellId) : undefined;
  const placement =
    child?.placement ?? (end ? edgeTextLayout(route, end, flipped, view.endTextGap()).placement : edge.labelPlacement);
  // Texte du milieu qui suit la flèche : son point le long du trait dessiné (glissement compris).
  const along = !child && !end ? view.followedText(elementId) : undefined;
  const point = along ? alongAnchor(along).point : labelPoint(route, placement);
  const at = view.projection.screenOfPoint(point, view.elementTop(elementId));
  return { x: at.x, y: at.y, width: 0, height: 0 };
}

/**
 * Cadre de l'éditeur en place d'une forme : sa zone de texte à ce niveau de rendu, réduite des marges propres au
 * style (`spacingLeft`…), comme sur toutes les formes (la BDD sous son ellipse, le process étiqueté hors de sa
 * tranche) ; les marges communes restent à l'intérieur du cadre.
 */
function labelEditZone(view: LabelEditView, shape: ShapeModel): Rect {
  return insetRect(view.textZone(shape, view.level), labelMargins(shape.style));
}

/**
 * Plan du texte d'une forme vue de biais ou tournée : sa zone de texte et ses coins projetés à l'écran,
 * à la hauteur où le label est dessiné. Vue de dessus non tournée : undefined (rectangle `screen`).
 */
export function labelEditPlane(view: LabelEditView, elementId: string): LabelEditPlane | undefined {
  const sign = signPlane(view, elementId);
  if (sign) return sign;
  const { tilt, rotation, fov } = view.camera;
  if (tilt === 0 && rotation === 0 && fov === undefined) return undefined;
  const shape = shapeOf(view.page, elementId);
  if (!shape) return undefined;
  const zone = labelEditZone(view, shape);
  const top = view.labelTop(shape);
  const at = (p: Point) => view.projection.screenOfPoint(p, top);
  const [topLeft, topRight, bottomRight, bottomLeft] = rectPath(zone).map(at);
  return { width: zone.width, height: zone.height, corners: [topLeft!, topRight!, bottomRight!, bottomLeft!] };
}

/**
 * Pancarte d'une silhouette debout (Actor en iso / 3D) : cadre du panneau et ses coins à l'écran, dans le sens de
 * lecture du texte (haut gauche, haut droit, bas droit, bas gauche). `undefined` sans pancarte.
 */
function signPlane(view: LabelEditView, elementId: string): LabelEditPlane | undefined {
  const standing = view.projection.standingPlane(elementId);
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

/** Pixels écran par pixel de page au niveau d'un élément (taille du texte de l'éditeur en place). */
export function textScale(view: LabelEditView, elementId: string): number {
  if (view.camera.mode !== '3d') return view.camera.zoom;
  const rect = view.projection.screenRectOf(elementId);
  const top = view.elementTop(elementId);
  const middle = rect ? screenToPage(view.camera, view.viewport, center(rect)) : { x: 0, y: 0 };
  const at = view.projection.screenOfPoint(middle, top);
  const dx = view.projection.screenOfPoint({ x: middle.x + 10, y: middle.y }, top);
  const dy = view.projection.screenOfPoint({ x: middle.x, y: middle.y + 10 }, top);
  return Math.max(distance(at, dx), distance(at, dy)) / 10;
}

/**
 * Bascule proposée pour un texte de début / fin en configuration par défaut (`flipTarget`) : son sens ; undefined
 * sans bascule possible.
 */
export function flipDirection(view: LabelEditView, request: LabelEditRequest): LabelEditRequest['flip'] {
  const edge = edgeOf(view.page, request.elementId);
  const route = view.route(request.elementId);
  if (!request.onEdge || !request.end || !edge || !route?.length) return undefined;
  const child = request.labelCellId ? byId(edge.labels, request.labelCellId) : undefined;
  const placement =
    child?.placement ?? edgeTextLayout(route, request.end, request.flipped, view.endTextGap()).placement;
  return flipTarget(route, request.end, placement, child?.style ?? request.style, view.endTextGap())?.direction;
}

/**
 * Angle à l'écran d'un texte du milieu qui suit sa flèche : celui du trait dessiné au point du texte, jamais à
 * l'envers (comme le texte dessiné) ; undefined si le texte ne suit pas la flèche ou reste horizontal.
 */
export function followedTextAngle(view: LabelEditView, edgeId: string): number | undefined {
  const along = view.followedText(edgeId);
  if (!along) return undefined;
  const { point, tangent } = alongAnchor(along);
  const top = view.elementTop(edgeId);
  const from = view.projection.screenOfPoint(point, top);
  const to = view.projection.screenOfPoint({ x: point.x + tangent.x * 10, y: point.y + tangent.y * 10 }, top);
  let angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (angle > Math.PI / 2 + 1e-9) angle -= Math.PI;
  else if (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI;
  return Math.abs(angle) < 1e-9 ? undefined : angle;
}

/**
 * Forme (ou texte de flèche) coupé par le bord du canvas : vue qui la montre en entier, déplacée (translation
 * seule) juste assez ; undefined si elle est déjà entièrement visible.
 */
export function revealTarget(view: LabelEditView, request: LabelEditRequest): CameraState | undefined {
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
  const shape = request.onEdge ? undefined : view.projection.screenRectOf(request.elementId);
  const box = unionOf([text, shape].filter((rect): rect is Rect => rect !== undefined));
  if (!box) return undefined;
  const shift = revealShift(box, view.viewport, REVEAL_MARGIN);
  if (shift.x === 0 && shift.y === 0) return undefined;
  const from = center(box);
  const to = { x: from.x + shift.x, y: from.y + shift.y };
  return dragGround(view.camera, view.viewport, from, to);
}
