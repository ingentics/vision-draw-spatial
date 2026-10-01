import type { OrthographicCamera } from 'three';
import type { Point, Rect } from '../model/types';

/**
 * État de caméra sérialisable (SPEC §5.1, §9). En vue de dessus, la caméra regarde le sol
 * à la verticale ; `center` est le point de la page au centre de l'écran, en coordonnées draw.io.
 */
export interface CameraState {
  mode: 'top';
  center: Point;
  /** Pixels écran par pixel draw.io (1 = 100 %). */
  zoom: number;
  /** Orientation de la vue autour de la verticale, en radians (0 = comme dans draw.io). */
  rotation: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;

/** Hauteur de la caméra au-dessus du sol : sans effet visuel en orthographique, il suffit d'être au-dessus. */
const CAMERA_HEIGHT = 1000;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Complète un état partiel ou ancien (ex. restauré depuis le stockage, sans `rotation`). */
export function normalizeCameraState(state: Partial<CameraState> & Pick<CameraState, 'center' | 'zoom'>): CameraState {
  return {
    mode: 'top',
    center: { x: state.center.x, y: state.center.y },
    zoom: clampZoom(state.zoom),
    rotation: normalizeAngle(state.rotation ?? 0),
  };
}

/** Angle ramené dans ]-π, π]. */
export function normalizeAngle(angle: number): number {
  const turn = Math.PI * 2;
  let a = angle % turn;
  if (a <= -Math.PI) a += turn;
  if (a > Math.PI) a -= turn;
  return a;
}

/**
 * Axes de l'écran exprimés en coordonnées page : `right` = vers la droite de l'écran,
 * `down` = vers le bas de l'écran. Sans rotation : (1, 0) et (0, 1), comme draw.io.
 */
export function screenAxes(rotation: number): { right: Point; down: Point } {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { right: { x: cos, y: sin }, down: { x: -sin, y: cos } };
}

/**
 * Cadre une emprise dans le viewport, avec une marge en pixels écran.
 * Comme draw.io à l'ouverture, on ne dépasse pas 100 % pour les petits schémas.
 */
export function fitBounds(
  bounds: Rect,
  viewport: Viewport,
  options: { padding?: number; maxZoom?: number } = {},
): CameraState {
  const padding = options.padding ?? 40;
  const maxZoom = options.maxZoom ?? 1;
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const availableWidth = Math.max(viewport.width - 2 * padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * padding, 1);
  const zoom =
    bounds.width > 0 || bounds.height > 0
      ? Math.min(
          availableWidth / Math.max(bounds.width, 1e-6),
          availableHeight / Math.max(bounds.height, 1e-6),
          maxZoom,
        )
      : maxZoom;
  return { mode: 'top', center, zoom: clampZoom(zoom), rotation: 0 };
}

/** Applique l'état à une caméra orthographique. Monde : X = x, Z = y, Y vers le haut. */
export function applyCameraState(camera: OrthographicCamera, state: CameraState, viewport: Viewport): void {
  const halfWidth = viewport.width / 2 / state.zoom;
  const halfHeight = viewport.height / 2 / state.zoom;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = 1;
  camera.far = CAMERA_HEIGHT * 2;
  camera.position.set(state.center.x, CAMERA_HEIGHT, state.center.y);
  // Haut de l'écran = opposé de l'axe « bas » de l'écran, exprimé dans le monde (x → X, y → Z).
  const { down } = screenAxes(state.rotation);
  camera.up.set(-down.x, 0, -down.y);
  camera.lookAt(state.center.x, 0, state.center.y);
  camera.updateProjectionMatrix();
}

/** Point de la page sous un point écran (pixels CSS depuis le coin haut-gauche du canvas). */
export function screenToPage(state: CameraState, viewport: Viewport, screen: Point): Point {
  const { right, down } = screenAxes(state.rotation);
  const sx = (screen.x - viewport.width / 2) / state.zoom;
  const sy = (screen.y - viewport.height / 2) / state.zoom;
  return {
    x: state.center.x + sx * right.x + sy * down.x,
    y: state.center.y + sx * right.y + sy * down.y,
  };
}

export function pageToScreen(state: CameraState, viewport: Viewport, page: Point): Point {
  const { right, down } = screenAxes(state.rotation);
  const dx = page.x - state.center.x;
  const dy = page.y - state.center.y;
  return {
    x: viewport.width / 2 + (dx * right.x + dy * right.y) * state.zoom,
    y: viewport.height / 2 + (dx * down.x + dy * down.y) * state.zoom,
  };
}

/** Centre tel que le point page `page` apparaisse au point écran `screen`. */
function centerKeeping(state: CameraState, viewport: Viewport, page: Point, screen: Point): Point {
  const { right, down } = screenAxes(state.rotation);
  const sx = (screen.x - viewport.width / 2) / state.zoom;
  const sy = (screen.y - viewport.height / 2) / state.zoom;
  return { x: page.x - sx * right.x - sy * down.x, y: page.y - sx * right.y - sy * down.y };
}

/** Déplace la vue d'un vecteur écran : le contenu suit le pointeur (glisser = « attraper » le sol). */
export function panByScreen(state: CameraState, delta: Point): CameraState {
  const { right, down } = screenAxes(state.rotation);
  const dx = delta.x / state.zoom;
  const dy = delta.y / state.zoom;
  return {
    ...state,
    center: {
      x: state.center.x - dx * right.x - dy * down.x,
      y: state.center.y - dx * right.y - dy * down.y,
    },
  };
}

/** Zoom multiplicatif en gardant fixe le point de la page sous `screen` (molette centrée sur le curseur). */
export function zoomAt(state: CameraState, viewport: Viewport, screen: Point, factor: number): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const zoomed = { ...state, zoom: clampZoom(state.zoom * factor) };
  return { ...zoomed, center: centerKeeping(zoomed, viewport, anchor, screen) };
}

/** Tourne la vue autour d'un point écran, qui reste sous le curseur. */
export function rotateAround(state: CameraState, viewport: Viewport, screen: Point, delta: number): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const rotated = { ...state, rotation: normalizeAngle(state.rotation + delta) };
  return { ...rotated, center: centerKeeping(rotated, viewport, anchor, screen) };
}
