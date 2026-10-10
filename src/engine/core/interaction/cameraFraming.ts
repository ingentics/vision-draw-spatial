import type { Point, Rect } from '../model/types';
import { center, distance, fitScale, rectPath } from '../model/geometry';
import { clampTilt, clampZoom, DEFAULT_CAMERA_LIMITS, normalizeAngle, withViewMode } from './cameraState';
import type { CameraLimits, CameraState, Viewport, ViewMode } from './cameraState';
import { pageToScreen, screenAxes } from './cameraProjection';

/** Cadrages : emprise à l'écran, vue par défaut d'un mode, cycle de la touche Entrée. */

/**
 * Cadre une emprise dans le viewport, avec une marge en pixels écran, pour une orientation
 * et une inclinaison données (l'emprise vue à l'écran doit tenir). Comme draw.io à l'ouverture,
 * on ne dépasse pas 100 % pour les petits schémas.
 */
export function fitBounds(
  bounds: Rect,
  viewport: Viewport,
  options: {
    padding?: number;
    maxZoom?: number;
    rotation?: number;
    tilt?: number;
    mode?: ViewMode;
    limits?: CameraLimits;
  } = {},
): CameraState {
  const limits = options.limits ?? DEFAULT_CAMERA_LIMITS;
  const padding = options.padding ?? 40;
  const maxZoom = options.maxZoom ?? 1;
  const rotation = normalizeAngle(options.rotation ?? 0);
  const tilt = clampTilt(options.tilt ?? 0, options.mode, limits);
  const middle = center(bounds);

  // Dimensions de l'emprise vue à l'écran : projection des demi-diagonales sur les axes écran.
  const { right, down } = screenAxes(rotation);
  const hw = bounds.width / 2;
  const hh = bounds.height / 2;
  const screenWidth = 2 * (Math.abs(hw * right.x) + Math.abs(hh * right.y));
  const screenHeight = 2 * (Math.abs(hw * down.x) + Math.abs(hh * down.y)) * Math.cos(tilt);

  const availableWidth = Math.max(viewport.width - 2 * padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * padding, 1);
  const zoom = Math.min(
    fitScale({ width: screenWidth, height: screenHeight }, { width: availableWidth, height: availableHeight }, maxZoom),
    maxZoom,
  );
  if (options.mode === '3d')
    return fitPerspective(bounds, viewport, { center: middle, zoom, rotation, tilt, padding, maxZoom }, limits);
  return {
    mode: options.mode ?? (tilt > 0 ? 'iso' : 'top'),
    center: middle,
    zoom: clampZoom(zoom, undefined, limits),
    rotation,
    tilt,
  };
}

/**
 * Cadrage en perspective : le zoom change aussi la déformation (la caméra avance), on part du
 * cadrage orthographique et on corrige jusqu'à ce que les coins projetés tiennent à l'écran.
 */
function fitPerspective(
  bounds: Rect,
  viewport: Viewport,
  fit: { center: Point; zoom: number; rotation: number; tilt: number; padding: number; maxZoom: number },
  limits: CameraLimits,
): CameraState {
  const availableWidth = Math.max(viewport.width - 2 * fit.padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * fit.padding, 1);
  const corners = rectPath(bounds);
  let state: CameraState = {
    mode: '3d',
    center: fit.center,
    zoom: clampZoom(fit.zoom, '3d', limits),
    rotation: fit.rotation,
    tilt: fit.tilt,
    fov: limits.fov,
  };
  if (bounds.width <= 0 && bounds.height <= 0) return state;
  for (let i = 0; i < 6; i++) {
    let halfWidth = 0;
    let halfHeight = 0;
    for (const corner of corners) {
      const screen = pageToScreen(state, viewport, corner);
      halfWidth = Math.max(halfWidth, Math.abs(screen.x - viewport.width / 2));
      halfHeight = Math.max(halfHeight, Math.abs(screen.y - viewport.height / 2));
    }
    const factor = Math.min(
      availableWidth / Math.max(2 * halfWidth, 1e-6),
      availableHeight / Math.max(2 * halfHeight, 1e-6),
    );
    const zoom = clampZoom(Math.min(state.zoom * factor, fit.maxZoom), '3d', limits);
    if (Math.abs(zoom - state.zoom) / state.zoom < 1e-3) break;
    state = { ...state, zoom };
  }
  return state;
}

/**
 * Vue par défaut d'un mode, comme à l'ouverture de la page : orientation de référence du mode
 * (nord en haut en 2D, réglages iso en iso et en 3D) et page entière à l'écran (au plus 100 %).
 */
export function defaultView(
  bounds: Rect,
  viewport: Viewport,
  mode: ViewMode,
  isoTilt: number,
  isoAzimuth = 0,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  const reference = withViewMode(
    { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 },
    mode,
    isoTilt,
    isoAzimuth,
    limits,
  );
  return fitBounds(bounds, viewport, { rotation: reference.rotation, tilt: reference.tilt, mode, limits });
}

/** Deux états sont-ils (quasiment) la même vue ? */
export function sameView(a: CameraState, b: CameraState, viewport: Viewport): boolean {
  const tolerancePx = 1;
  const size = Math.max(viewport.width, viewport.height);
  const centerPx = distance(a.center, b.center) * a.zoom;
  return (
    Math.abs(a.zoom - b.zoom) / b.zoom < 1e-3 &&
    centerPx < tolerancePx &&
    Math.abs(normalizeAngle(a.rotation - b.rotation)) * size < tolerancePx &&
    Math.abs(a.tilt - b.tilt) * size < tolerancePx &&
    Math.abs((a.fov ?? 0) - (b.fov ?? 0)) * size < tolerancePx
  );
}

/** Vues que parcourt la touche Entrée quand il y a une sélection, dans l'ordre (ticket 242). */
const OVERVIEW_CYCLE = ['selection', 'actual', 'global'] as const;
export type OverviewStep = (typeof OVERVIEW_CYCLE)[number];

/**
 * Prochaine vue du cycle sélection → 1:1 → globale. L'étape courante est la dernière jouée si la vue n'a pas bougé
 * depuis, sinon la vue globale ou sélection qu'elle reproduit ; une autre vue repart de la sélection. Une étape qui
 * ne changerait rien à l'écran est sautée.
 */
export function nextOverviewStep(
  current: CameraState,
  views: Record<OverviewStep, CameraState>,
  last: { step: OverviewStep; view: CameraState } | undefined,
  viewport: Viewport,
): { step: OverviewStep; view: CameraState } {
  const at =
    last && sameView(current, last.view, viewport)
      ? last.step
      : sameView(current, views.global, viewport)
        ? 'global'
        : sameView(current, views.selection, viewport)
          ? 'selection'
          : undefined;
  let index = at === undefined ? 0 : (OVERVIEW_CYCLE.indexOf(at) + 1) % OVERVIEW_CYCLE.length;
  for (let tries = 1; tries < OVERVIEW_CYCLE.length; tries++) {
    if (!sameView(current, views[OVERVIEW_CYCLE[index]!], viewport)) break;
    index = (index + 1) % OVERVIEW_CYCLE.length;
  }
  const step = OVERVIEW_CYCLE[index]!;
  return { step, view: views[step] };
}

/**
 * Une forme (emprise à l'écran `rect`) est-elle à recentrer pour rester dans la vue (sujet 467, `keepInView`) ? Une
 * forme qui tient dans la vue doit y être entière, à `margin` px des bords (barres posées sur la zone de dessin) ; une
 * forme plus grande seulement en partie visible.
 */
export function needsRecentring(rect: Rect, viewport: Viewport, margin: number): boolean {
  const { width, height } = viewport;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  if (rect.width <= width - 2 * margin && rect.height <= height - 2 * margin)
    return rect.x < margin || rect.y < margin || right > width - margin || bottom > height - margin;
  return right <= 0 || bottom <= 0 || rect.x >= width || rect.y >= height;
}
