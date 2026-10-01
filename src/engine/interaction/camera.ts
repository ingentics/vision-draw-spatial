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
  return { mode: 'top', center, zoom: clampZoom(zoom) };
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
  // Haut de l'écran = -Z, donc y draw.io croissant vers le bas de l'écran, comme dans draw.io.
  camera.up.set(0, 0, -1);
  camera.lookAt(state.center.x, 0, state.center.y);
  camera.updateProjectionMatrix();
}

/** Point de la page sous un point écran (pixels CSS depuis le coin haut-gauche du canvas). */
export function screenToPage(state: CameraState, viewport: Viewport, screen: Point): Point {
  return {
    x: state.center.x + (screen.x - viewport.width / 2) / state.zoom,
    y: state.center.y + (screen.y - viewport.height / 2) / state.zoom,
  };
}

export function pageToScreen(state: CameraState, viewport: Viewport, page: Point): Point {
  return {
    x: (page.x - state.center.x) * state.zoom + viewport.width / 2,
    y: (page.y - state.center.y) * state.zoom + viewport.height / 2,
  };
}
