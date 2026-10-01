import type { OrthographicCamera } from 'three';
import type { Point, Rect } from '../model/types';

/**
 * État de caméra sérialisable (SPEC §5.1, §9). La caméra est orthographique et regarde le sol :
 * - vue de dessus (`top`) : à la verticale, comme draw.io ;
 * - vue isométrique (`iso`) : inclinée de `tilt` vers le haut de l'écran (SPEC §9.1).
 * `center` est le point de la page (au sol) au centre de l'écran, en coordonnées draw.io.
 */
export interface CameraState {
  /** Mode demandé ; pendant une bascule animée, `tilt` est la valeur courante. */
  mode: 'top' | 'iso';
  center: Point;
  /** Pixels écran par pixel draw.io, le long de l'axe horizontal de l'écran (1 = 100 %). */
  zoom: number;
  /** Orientation de la vue autour de la verticale, en radians (0 = comme dans draw.io). */
  rotation: number;
  /** Inclinaison par rapport à la verticale, en radians (0 = vue de dessus). */
  tilt: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;
/** Inclinaison maximale : au-delà, le sol devient trop rasant pour être lisible. */
export const MAX_TILT = (80 * Math.PI) / 180;
/** Élévation de la caméra en isométrie vraie (arctan(1/√2) ≈ 35,26°). */
export const ISOMETRIC_ELEVATION_DEG = 35.26;

/** Inclinaison correspondant à une élévation de la caméra au-dessus du sol (SPEC §13 `isoAngleDeg`). */
export function tiltFromElevation(elevationDeg: number): number {
  return clampTilt(((90 - elevationDeg) * Math.PI) / 180);
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function clampTilt(tilt: number): number {
  return Math.min(MAX_TILT, Math.max(0, tilt));
}

/** Complète un état partiel ou ancien (ex. restauré depuis le stockage, sans `rotation` ni `tilt`). */
export function normalizeCameraState(state: Partial<CameraState> & Pick<CameraState, 'center' | 'zoom'>): CameraState {
  const tilt = clampTilt(state.tilt ?? 0);
  return {
    mode: state.mode ?? (tilt > 0 ? 'iso' : 'top'),
    center: { x: state.center.x, y: state.center.y },
    zoom: clampZoom(state.zoom),
    rotation: normalizeAngle(state.rotation ?? 0),
    tilt,
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
 * Axes de l'écran exprimés en coordonnées page (au sol) : `right` = vers la droite de l'écran,
 * `down` = vers le bas de l'écran. Sans rotation : (1, 0) et (0, 1), comme draw.io.
 */
export function screenAxes(rotation: number): { right: Point; down: Point } {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { right: { x: cos, y: sin }, down: { x: -sin, y: cos } };
}

/**
 * Écrasement vertical du sol à l'écran : une longueur au sol dans l'axe « bas de l'écran »
 * apparaît multipliée par cos(tilt). 1 en vue de dessus.
 */
export function verticalScale(state: Pick<CameraState, 'tilt'>): number {
  return Math.cos(state.tilt);
}

/**
 * Cadre une emprise dans le viewport, avec une marge en pixels écran, pour une orientation
 * et une inclinaison données (l'emprise vue à l'écran doit tenir). Comme draw.io à l'ouverture,
 * on ne dépasse pas 100 % pour les petits schémas.
 */
export function fitBounds(
  bounds: Rect,
  viewport: Viewport,
  options: { padding?: number; maxZoom?: number; rotation?: number; tilt?: number } = {},
): CameraState {
  const padding = options.padding ?? 40;
  const maxZoom = options.maxZoom ?? 1;
  const rotation = normalizeAngle(options.rotation ?? 0);
  const tilt = clampTilt(options.tilt ?? 0);
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

  // Dimensions de l'emprise vue à l'écran : projection des demi-diagonales sur les axes écran.
  const { right, down } = screenAxes(rotation);
  const hw = bounds.width / 2;
  const hh = bounds.height / 2;
  const screenWidth = 2 * (Math.abs(hw * right.x) + Math.abs(hh * right.y));
  const screenHeight = 2 * (Math.abs(hw * down.x) + Math.abs(hh * down.y)) * Math.cos(tilt);

  const availableWidth = Math.max(viewport.width - 2 * padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * padding, 1);
  const zoom =
    screenWidth > 0 || screenHeight > 0
      ? Math.min(availableWidth / Math.max(screenWidth, 1e-6), availableHeight / Math.max(screenHeight, 1e-6), maxZoom)
      : maxZoom;
  return { mode: tilt > 0 ? 'iso' : 'top', center, zoom: clampZoom(zoom), rotation, tilt };
}

/** Deux états sont-ils (quasiment) la même vue ? */
export function sameView(a: CameraState, b: CameraState, viewport: Viewport): boolean {
  const tolerancePx = 1;
  const size = Math.max(viewport.width, viewport.height);
  const centerPx = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) * a.zoom;
  return (
    Math.abs(a.zoom - b.zoom) / b.zoom < 1e-3 &&
    centerPx < tolerancePx &&
    Math.abs(normalizeAngle(a.rotation - b.rotation)) * size < tolerancePx &&
    Math.abs(a.tilt - b.tilt) * size < tolerancePx
  );
}

/**
 * Interpolation entre deux vues, comme un vrai zoom : le zoom progresse géométriquement et le
 * centre suit l'inverse du zoom, si bien qu'un point de l'écran reste fixe pendant tout le trajet
 * (pas de « glissade » du centre en ligne droite). Rotation par le plus court chemin,
 * inclinaison linéaire.
 */
export function interpolateCamera(from: CameraState, to: CameraState, t: number): CameraState {
  const rotationDelta = normalizeAngle(to.rotation - from.rotation);
  const zoom = from.zoom * Math.pow(to.zoom / from.zoom, t);
  // Poids du centre : linéaire en 1/zoom (repli linéaire si le zoom ne change pas).
  const inverseSpan = 1 / from.zoom - 1 / to.zoom;
  const weight = Math.abs(inverseSpan) < 1e-12 ? t : (1 / from.zoom - 1 / zoom) / inverseSpan;
  return {
    mode: to.mode,
    center: {
      x: from.center.x + (to.center.x - from.center.x) * weight,
      y: from.center.y + (to.center.y - from.center.y) * weight,
    },
    zoom,
    rotation: normalizeAngle(from.rotation + rotationDelta * t),
    tilt: from.tilt + (to.tilt - from.tilt) * t,
  };
}

/**
 * Applique l'état à une caméra orthographique. Monde : X = x, Z = y, Y vers le haut.
 * La caméra est placée « derrière » (côté bas de l'écran) et au-dessus du centre, inclinée de `tilt`.
 */
export function applyCameraState(camera: OrthographicCamera, state: CameraState, viewport: Viewport): void {
  const halfWidth = viewport.width / 2 / state.zoom;
  const halfHeight = viewport.height / 2 / state.zoom;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;

  // Distance de la caméra : au-delà de tout ce qui peut être visible, même incliné et dézoomé.
  const k = Math.max(Math.cos(state.tilt), 0.05);
  const reach = Math.max(viewport.width, viewport.height) / state.zoom / k;
  const distance = reach + 1000;
  camera.near = 1;
  camera.far = 2 * distance + reach;

  const { down } = screenAxes(state.rotation);
  const sin = Math.sin(state.tilt);
  const cos = Math.cos(state.tilt);
  camera.position.set(
    state.center.x + distance * sin * down.x,
    distance * cos,
    state.center.y + distance * sin * down.y,
  );
  // Haut de l'écran : vers le ciel et vers l'avant (opposé de « bas de l'écran »).
  camera.up.set(-cos * down.x, sin, -cos * down.y);
  camera.lookAt(state.center.x, 0, state.center.y);
  camera.updateProjectionMatrix();
}

/** Point du sol (coordonnées page) sous un point écran (pixels CSS depuis le coin haut-gauche du canvas). */
export function screenToPage(state: CameraState, viewport: Viewport, screen: Point): Point {
  const { right, down } = screenAxes(state.rotation);
  const sx = (screen.x - viewport.width / 2) / state.zoom;
  const sy = (screen.y - viewport.height / 2) / (state.zoom * verticalScale(state));
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
    y: viewport.height / 2 + (dx * down.x + dy * down.y) * state.zoom * verticalScale(state),
  };
}

/** Centre tel que le point page `page` apparaisse au point écran `screen`. */
function centerKeeping(state: CameraState, viewport: Viewport, page: Point, screen: Point): Point {
  const { right, down } = screenAxes(state.rotation);
  const sx = (screen.x - viewport.width / 2) / state.zoom;
  const sy = (screen.y - viewport.height / 2) / (state.zoom * verticalScale(state));
  return { x: page.x - sx * right.x - sy * down.x, y: page.y - sx * right.y - sy * down.y };
}

/** Déplace la vue d'un vecteur écran : le contenu suit le pointeur (glisser = « attraper » le sol). */
export function panByScreen(state: CameraState, delta: Point): CameraState {
  const { right, down } = screenAxes(state.rotation);
  const dx = delta.x / state.zoom;
  const dy = delta.y / (state.zoom * verticalScale(state));
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

/** Incline la vue (mode iso) en gardant fixe le point du sol sous `screen`. */
export function tiltAround(state: CameraState, viewport: Viewport, screen: Point, delta: number): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const tilted = { ...state, tilt: clampTilt(state.tilt + delta) };
  return { ...tilted, center: centerKeeping(tilted, viewport, anchor, screen) };
}

/**
 * Même vue, autre mode (le centre de l'écran ne bouge pas). L'isométrie vraie combine
 * l'inclinaison et une rotation de `isoAzimuth` (45°) : on l'ajoute en entrant en iso et on la
 * retire en sortant, si bien qu'un aller-retour rend exactement l'orientation de départ.
 */
export function withViewMode(state: CameraState, mode: 'top' | 'iso', isoTilt: number, isoAzimuth = 0): CameraState {
  if (state.mode === mode) return { ...state, tilt: mode === 'iso' ? clampTilt(isoTilt) : 0 };
  const rotation = normalizeAngle(state.rotation + (mode === 'iso' ? isoAzimuth : -isoAzimuth));
  return { ...state, mode, rotation, tilt: mode === 'iso' ? clampTilt(isoTilt) : 0 };
}
