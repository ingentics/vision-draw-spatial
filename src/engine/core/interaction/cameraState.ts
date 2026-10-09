import type { Point } from '../model/types';
import type { CameraSettings } from '../settings/types';
import { clamp } from '../model/numbers';

/** État de caméra : modes de vue, bornes, normalisation et changement de mode (sans projection ni mouvement). */

export type ViewMode = 'top' | 'iso' | '3d';

/**
 * État de caméra sérialisable (SPEC §5.1, §9). La caméra regarde le sol :
 * - vue de dessus (`top`) : orthographique, à la verticale, comme draw.io ;
 * - vue isométrique (`iso`) : orthographique, inclinée de `tilt` vers le haut de l'écran (SPEC §9.1) ;
 * - vue 3D (`3d`) : en perspective, comme un jeu de construction (SPEC §9.1).
 * `center` est le point de la page (au sol) au centre de l'écran, en coordonnées draw.io.
 */
export interface CameraState {
  /** Mode demandé ; pendant une bascule animée, `tilt` (et `fov`) sont les valeurs courantes. */
  mode: ViewMode;
  center: Point;
  /**
   * Pixels écran par pixel draw.io, le long de l'axe horizontal de l'écran (1 = 100 %).
   * En perspective : au centre de l'écran (la caméra est à la distance qui donne ce zoom).
   */
  zoom: number;
  /** Orientation de la vue autour de la verticale, en radians (0 = comme dans draw.io). */
  rotation: number;
  /** Inclinaison par rapport à la verticale, en radians (0 = vue de dessus). */
  tilt: number;
  /**
   * Champ de vision vertical en radians : présent = projection en perspective (mode 3D, et
   * pendant une bascule vers / depuis la 3D, où il passe par `FLAT_FOV`, quasi orthographique).
   */
  fov?: number;
}

export interface Viewport {
  width: number;
  height: number;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 16;
/** Inclinaison maximale : au-delà, le sol devient trop rasant pour être lisible. */
const MAX_TILT = (80 * Math.PI) / 180;
/** Élévation de la caméra en isométrie vraie (arctan(1/√2) ≈ 35,26°). */
export const ISOMETRIC_ELEVATION_DEG = 35.26;

/** Vue 3D : champ de vision vertical. */
export const PERSPECTIVE_FOV = (45 * Math.PI) / 180;
/** Champ de vision quasi nul (vue quasi orthographique) : départ / arrivée d'une bascule 2D/iso ↔ 3D. */
export const FLAT_FOV = (1 * Math.PI) / 180;
/** Vue 3D : zoom bornés (dézoom maximal, zoom maximal), comme dans un jeu de construction. */
export const MIN_ZOOM_3D = 0.1;
export const MAX_ZOOM_3D = 4;
/** Vue 3D : inclinaison maximale, l'horizon reste hors de l'écran (90° − 65° > moitié du champ). */
export const MAX_TILT_3D = (65 * Math.PI) / 180;

/**
 * Bornes de la caméra (paramètres « Caméra », SPEC §13). Propres à chaque moteur (`ViewCamera.limits`) : les
 * fonctions qui en dépendent les reçoivent en dernier paramètre, les constantes ci-dessus par défaut.
 */
export interface CameraLimits {
  minZoom: number;
  maxZoom: number;
  minZoom3d: number;
  maxZoom3d: number;
  /** En radians. */
  maxTilt3d: number;
  /** Champ de vision vertical de la 3D, en radians. */
  fov: number;
}

export const DEFAULT_CAMERA_LIMITS: Readonly<CameraLimits> = {
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  minZoom3d: MIN_ZOOM_3D,
  maxZoom3d: MAX_ZOOM_3D,
  maxTilt3d: MAX_TILT_3D,
  fov: PERSPECTIVE_FOV,
};

/** Bornes tirées des paramètres « Caméra » (angles en degrés côté réglages, en radians côté caméra). */
export function cameraLimitsOf(camera: CameraSettings): CameraLimits {
  return {
    minZoom: camera.minZoom,
    maxZoom: camera.maxZoom,
    minZoom3d: camera.minZoom3d,
    maxZoom3d: camera.maxZoom3d,
    maxTilt3d: (camera.maxTilt3dDeg * Math.PI) / 180,
    fov: (camera.fovDeg * Math.PI) / 180,
  };
}

/** Inclinaison correspondant à une élévation de la caméra au-dessus du sol (SPEC §13 `isoAngleDeg`). */
export function tiltFromElevation(elevationDeg: number): number {
  return clampTilt(((90 - elevationDeg) * Math.PI) / 180);
}

/**
 * Zoom borné ; plus resserré en vue 3D. Bornes dans l'ordre : les réglages passent par `orderedZooms` (maximum jamais
 * sous le minimum), sans quoi `clamp` ferait gagner le minimum là où l'ancienne écriture faisait gagner le maximum.
 */
export function clampZoom(zoom: number, mode?: ViewMode, limits: CameraLimits = DEFAULT_CAMERA_LIMITS): number {
  return mode === '3d' ? clamp(zoom, limits.minZoom3d, limits.maxZoom3d) : clamp(zoom, limits.minZoom, limits.maxZoom);
}

export function clampTilt(tilt: number, mode?: ViewMode, limits: CameraLimits = DEFAULT_CAMERA_LIMITS): number {
  return clamp(tilt, 0, mode === '3d' ? limits.maxTilt3d : MAX_TILT);
}

/** Complète un état partiel ou ancien (ex. restauré depuis le stockage, sans `rotation` ni `tilt`). */
export function normalizeCameraState(
  state: Partial<CameraState> & Pick<CameraState, 'center' | 'zoom'>,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  const tilt = clampTilt(state.tilt ?? 0, undefined, limits);
  const mode = state.mode ?? (tilt > 0 ? 'iso' : 'top');
  const fov = state.fov ?? (mode === '3d' ? limits.fov : undefined);
  return {
    mode,
    center: { x: state.center.x, y: state.center.y },
    zoom: clampZoom(state.zoom, undefined, limits),
    rotation: normalizeAngle(state.rotation ?? 0),
    tilt,
    // `limits.fov` vaut au moins 15° (réglage `fovDeg`), au-dessus de FLAT_FOV (1°) : bornes dans l'ordre.
    ...(fov === undefined ? {} : { fov: clamp(fov, FLAT_FOV, limits.fov) }),
  };
}

/**
 * État stable du mode, sans état de bascule : perspective pleine en 3D, orthographique sinon
 * (une bascule interrompue ne laisse pas une perspective intermédiaire), et en 2D ni rotation
 * ni inclinaison (nord en haut, à la verticale, comme draw.io).
 */
export function settleProjection(state: CameraState, limits: CameraLimits = DEFAULT_CAMERA_LIMITS): CameraState {
  const { fov: _fov, ...rest } = state;
  if (state.mode === '3d') return { ...rest, fov: limits.fov };
  return state.mode === 'top' ? { ...rest, rotation: 0, tilt: 0 } : rest;
}

/** Avancement de la perspective : 0 en orthographique (ou `FLAT_FOV`), 1 en vue 3D. */
export function perspectiveAmount(
  state: Pick<CameraState, 'fov'>,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): number {
  return state.fov === undefined ? 0 : (state.fov - FLAT_FOV) / (limits.fov - FLAT_FOV);
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
 * Même vue, autre mode (le centre de l'écran ne bouge pas). La 2D n'est jamais tournée (nord en
 * haut, comme draw.io). L'iso part de son orientation de référence (`isoAzimuth`, ±45° pour
 * l'isométrie vraie) en venant de la 2D ou de la 3D ; la 3D garde l'orientation de l'iso, et part
 * de l'azimut iso en venant de la 2D. Rester dans le même mode garde la rotation choisie.
 */
export function withViewMode(
  state: CameraState,
  mode: ViewMode,
  isoTilt: number,
  isoAzimuth = 0,
  limits: CameraLimits = DEFAULT_CAMERA_LIMITS,
): CameraState {
  const { fov: _fov, ...base } = state;
  if (mode === 'top') return { ...base, mode, rotation: 0, tilt: 0 };
  const rotation =
    state.mode === 'top' || (mode === 'iso' && state.mode === '3d') ? normalizeAngle(isoAzimuth) : state.rotation;
  if (mode === '3d') {
    const tilt = clampTilt(state.mode === '3d' ? state.tilt : isoTilt, '3d', limits);
    return { ...base, mode, rotation, tilt, zoom: clampZoom(state.zoom, '3d', limits), fov: limits.fov };
  }
  return { ...base, mode, rotation, tilt: clampTilt(isoTilt, mode, limits) };
}
