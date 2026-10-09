import type { Point, Rect } from '../model/types';
import { clampTilt, clampZoom, DEFAULT_CAMERA_LIMITS, FLAT_FOV, normalizeAngle } from './cameraState';
import type { CameraLimits, CameraState, Viewport } from './cameraState';
import { screenAxes, screenToPage, verticalScale } from './cameraProjection';

/** Mouvements de la vue : glisser, zoom, rotation, inclinaison, orbite, interpolation entre deux vues. */

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
  // Perspective : le champ de vision part de / arrive à `FLAT_FOV` côté orthographique.
  const fov =
    from.fov === undefined && to.fov === undefined
      ? undefined
      : t >= 1
        ? to.fov
        : (from.fov ?? FLAT_FOV) + ((to.fov ?? FLAT_FOV) - (from.fov ?? FLAT_FOV)) * t;
  return {
    mode: to.mode,
    center: {
      x: from.center.x + (to.center.x - from.center.x) * weight,
      y: from.center.y + (to.center.y - from.center.y) * weight,
    },
    zoom,
    rotation: normalizeAngle(from.rotation + rotationDelta * t),
    tilt: from.tilt + (to.tilt - from.tilt) * t,
    ...(fov === undefined ? {} : { fov }),
  };
}

/**
 * Centre tel que le point page `page` apparaisse au point écran `screen`. Déplacer le centre
 * translate toute la vue au sol (caméra comprise) : on corrige de l'écart constaté, exact
 * en orthographique comme en perspective.
 */
function centerKeeping(state: CameraState, viewport: Viewport, page: Point, screen: Point): Point {
  const seen = screenToPage(state, viewport, screen);
  return { x: state.center.x + page.x - seen.x, y: state.center.y + page.y - seen.y };
}

/**
 * Déplace la vue d'un vecteur écran : le contenu suit le pointeur (glisser = « attraper » le sol).
 * Exact au centre de l'écran ; pour un glisser, `dragGround` garde le point attrapé sous le pointeur.
 */
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

/**
 * Déplacement écran qui amène une boîte (écran) entièrement dans le viewport, à `margin` px du bord : nul si elle y est
 * déjà, sinon juste ce qu'il faut ; une boîte plus grande que la place disponible a son coin haut-gauche sur la marge.
 */
export function revealShift(box: Rect, viewport: Viewport, margin: number): Point {
  const axis = (start: number, size: number, length: number) => {
    if (size > length - 2 * margin || start < margin) return margin - start;
    return Math.min(length - margin - (start + size), 0);
  };
  return { x: axis(box.x, box.width, viewport.width), y: axis(box.y, box.height, viewport.height) };
}

/** Glisser de `from` à `to` (écran) : le point du sol attrapé sous `from` passe sous `to` (perspective comprise). */
export function dragGround(state: CameraState, viewport: Viewport, from: Point, to: Point): CameraState {
  if (state.fov === undefined) return panByScreen(state, { x: to.x - from.x, y: to.y - from.y });
  const grabbed = screenToPage(state, viewport, from);
  return { ...state, center: centerKeeping(state, viewport, grabbed, to) };
}

/** Zoom multiplicatif en gardant fixe le point de la page sous `screen` (molette centrée sur le curseur). */
export function zoomAt(
  state: CameraState,
  viewport: Viewport,
  screen: Point,
  factor: number,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const zoomed = { ...state, zoom: clampZoom(state.zoom * factor, state.mode, limits) };
  return { ...zoomed, center: centerKeeping(zoomed, viewport, anchor, screen) };
}

/** Tourne la vue autour d'un point écran, qui reste sous le curseur. */
export function rotateAround(state: CameraState, viewport: Viewport, screen: Point, delta: number): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const rotated = { ...state, rotation: normalizeAngle(state.rotation + delta) };
  return { ...rotated, center: centerKeeping(rotated, viewport, anchor, screen) };
}

/** Incline la vue (mode iso) en gardant fixe le point du sol sous `screen`. */
export function tiltAround(
  state: CameraState,
  viewport: Viewport,
  screen: Point,
  delta: number,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const tilted = { ...state, tilt: clampTilt(state.tilt + delta, state.mode, limits) };
  return { ...tilted, center: centerKeeping(tilted, viewport, anchor, screen) };
}

/**
 * Orbite autour du centre de l'écran (glisser clic droit, iso et 3D), comme dans un jeu de
 * construction. `rotate` tourne autour de la verticale, `tilt` incline (borné selon le mode).
 */
export function orbit(
  state: CameraState,
  rotate: number,
  tilt: number,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  return {
    ...state,
    rotation: normalizeAngle(state.rotation + rotate),
    tilt: clampTilt(state.tilt + tilt, state.mode, limits),
  };
}
