import type { OrthographicCamera, PerspectiveCamera } from 'three';
import type { Point } from '../model/types';
import { DEFAULT_CAMERA_LIMITS } from './cameraState';
import type { CameraLimits, CameraState, Viewport } from './cameraState';

/** Projection écran ↔ page (orthographique et perspective) et application de l'état à une caméra Three.js. */

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
  const reach = visibleReach(state, viewport);
  const distance = reach + 1000;
  camera.near = 1;
  camera.far = 2 * distance + reach;
  placeCamera(camera, state, distance);
  camera.updateProjectionMatrix();
}

/** Applique l'état (avec `fov`) à une caméra en perspective, placée à la distance qui donne le zoom au centre. */
export function applyPerspectiveState(
  camera: PerspectiveCamera,
  state: CameraState,
  viewport: Viewport,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): void {
  const fov = state.fov ?? limits.fov;
  const distance = focalLength(fov, viewport) / state.zoom;
  camera.fov = (fov * 180) / Math.PI;
  camera.aspect = viewport.width / viewport.height;
  // Le sol le plus lointain visible est à quelques distances (inclinaison bornée, §9.1).
  // Plan proche juste devant ce qui peut être visible : à champ de vision quasi nul (bascule iso ↔ 3D), la caméra
  // recule très loin, et un plan proche à 2 % de la distance ruinerait la précision en profondeur (les arêtes
  // arrière des volumes traverseraient le dessus des blocs).
  camera.near = Math.max(distance * 0.02, distance - visibleReach(state, viewport) - 1000, 0.01);
  camera.far = distance * 40 + 1000;
  placeCamera(camera, state, distance);
  camera.updateProjectionMatrix();
}

/** Étendue (en pixels de page) de ce qui peut être visible autour du centre, même incliné et dézoomé. */
function visibleReach(state: CameraState, viewport: Viewport): number {
  const k = Math.max(Math.cos(state.tilt), 0.05);
  return Math.max(viewport.width, viewport.height) / state.zoom / k;
}

function placeCamera(camera: OrthographicCamera | PerspectiveCamera, state: CameraState, distance: number): void {
  const { position, up } = cameraFrame(state, distance);
  camera.position.set(position.x, position.y, position.z);
  // Haut de l'écran : vers le ciel et vers l'avant (opposé de « bas de l'écran »).
  camera.up.set(up.x, up.y, up.z);
  camera.lookAt(state.center.x, 0, state.center.y);
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Distance focale en pixels écran pour un champ de vision vertical. */
function focalLength(fov: number, viewport: Viewport): number {
  return viewport.height / 2 / Math.tan(fov / 2);
}

/** Repère de la caméra dans le monde (X = x, Y vers le haut, Z = y) : position et axes de l'écran. */
function cameraFrame(state: CameraState, distance: number): { position: Vec3; forward: Vec3; up: Vec3; right: Vec3 } {
  const { right, down } = screenAxes(state.rotation);
  const sin = Math.sin(state.tilt);
  const cos = Math.cos(state.tilt);
  return {
    position: {
      x: state.center.x + distance * sin * down.x,
      y: distance * cos,
      z: state.center.y + distance * sin * down.y,
    },
    forward: { x: -sin * down.x, y: -cos, z: -sin * down.y },
    up: { x: -cos * down.x, y: sin, z: -cos * down.y },
    right: { x: right.x, y: 0, z: right.y },
  };
}

/**
 * Point de la page sous un point écran (pixels CSS depuis le coin haut-gauche du canvas), sur le
 * plan horizontal à `height` au-dessus du sol (0 = le sol).
 */
export function screenToPage(state: CameraState, viewport: Viewport, screen: Point, height = 0): Point {
  if (state.fov !== undefined) return perspectiveScreenToPage(state, state.fov, viewport, screen, height);
  const { right, down } = screenAxes(state.rotation);
  const sx = (screen.x - viewport.width / 2) / state.zoom;
  const sy = (screen.y - viewport.height / 2) / (state.zoom * verticalScale(state));
  // À une hauteur donnée, le rayon de vue y arrive plus près de la caméra, de height · tan(inclinaison).
  const shift = height * Math.tan(state.tilt);
  return {
    x: state.center.x + sx * right.x + (sy + shift) * down.x,
    y: state.center.y + sx * right.y + (sy + shift) * down.y,
  };
}

/** Point écran d'un point de la page posé à `height` au-dessus du sol (inverse de `screenToPage`). */
export function pageToScreen(state: CameraState, viewport: Viewport, page: Point, height = 0): Point {
  if (state.fov !== undefined) return perspectivePageToScreen(state, state.fov, viewport, page, height);
  const { right, down } = screenAxes(state.rotation);
  const shift = height * Math.tan(state.tilt);
  const dx = page.x - shift * down.x - state.center.x;
  const dy = page.y - shift * down.y - state.center.y;
  return {
    x: viewport.width / 2 + (dx * right.x + dy * right.y) * state.zoom,
    y: viewport.height / 2 + (dx * down.x + dy * down.y) * state.zoom * verticalScale(state),
  };
}

/** Rayon de vue du pixel, coupé par le plan horizontal `height` (au-dessus de l'horizon : point lointain). */
function perspectiveScreenToPage(
  state: CameraState,
  fov: number,
  viewport: Viewport,
  screen: Point,
  height: number,
): Point {
  const focal = focalLength(fov, viewport);
  const frame = cameraFrame(state, focal / state.zoom);
  const u = screen.x - viewport.width / 2;
  const v = screen.y - viewport.height / 2;
  const dir = {
    x: frame.forward.x * focal + frame.right.x * u - frame.up.x * v,
    y: frame.forward.y * focal + frame.right.y * u - frame.up.y * v,
    z: frame.forward.z * focal + frame.right.z * u - frame.up.z * v,
  };
  // Rayon qui ne redescend pas (ou à peine) : on le borne à une pente minimale.
  const descent = Math.max(-dir.y, 0.02 * Math.hypot(dir.x, dir.y, dir.z));
  const t = (frame.position.y - height) / descent;
  return { x: frame.position.x + t * dir.x, y: frame.position.z + t * dir.z };
}

function perspectivePageToScreen(
  state: CameraState,
  fov: number,
  viewport: Viewport,
  page: Point,
  height: number,
): Point {
  const focal = focalLength(fov, viewport);
  const distance = focal / state.zoom;
  const frame = cameraFrame(state, distance);
  const rel = { x: page.x - frame.position.x, y: height - frame.position.y, z: page.y - frame.position.z };
  const dot = (a: Vec3) => rel.x * a.x + rel.y * a.y + rel.z * a.z;
  // Derrière la caméra : ramené juste devant (évite l'inversion de signe).
  const depth = Math.max(dot(frame.forward), distance * 1e-3);
  return {
    x: viewport.width / 2 + (dot(frame.right) * focal) / depth,
    y: viewport.height / 2 - (dot(frame.up) * focal) / depth,
  };
}
