import type { OrthographicCamera, PerspectiveCamera } from 'three';
import type { Point, Rect } from '../model/types';

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

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;
/** Inclinaison maximale : au-delà, le sol devient trop rasant pour être lisible. */
export const MAX_TILT = (80 * Math.PI) / 180;
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
 * Bornes en vigueur (paramètres « Caméra », SPEC §13), les constantes ci-dessus par défaut. Réglage
 * du module, commun à toutes les vues de la page : `setCameraLimits` les remplace.
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

const limits: CameraLimits = {
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  minZoom3d: MIN_ZOOM_3D,
  maxZoom3d: MAX_ZOOM_3D,
  maxTilt3d: MAX_TILT_3D,
  fov: PERSPECTIVE_FOV,
};

export function setCameraLimits(next: CameraLimits): void {
  Object.assign(limits, next);
}

export function getCameraLimits(): CameraLimits {
  return { ...limits };
}

/** Inclinaison correspondant à une élévation de la caméra au-dessus du sol (SPEC §13 `isoAngleDeg`). */
export function tiltFromElevation(elevationDeg: number): number {
  return clampTilt(((90 - elevationDeg) * Math.PI) / 180);
}

/** Zoom borné ; plus resserré en vue 3D (bornes en vigueur, `setCameraLimits`). */
export function clampZoom(zoom: number, mode?: ViewMode): number {
  return mode === '3d'
    ? Math.min(limits.maxZoom3d, Math.max(limits.minZoom3d, zoom))
    : Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom));
}

export function clampTilt(tilt: number, mode?: ViewMode): number {
  return Math.min(mode === '3d' ? limits.maxTilt3d : MAX_TILT, Math.max(0, tilt));
}

/** Complète un état partiel ou ancien (ex. restauré depuis le stockage, sans `rotation` ni `tilt`). */
export function normalizeCameraState(state: Partial<CameraState> & Pick<CameraState, 'center' | 'zoom'>): CameraState {
  const tilt = clampTilt(state.tilt ?? 0);
  const mode = state.mode ?? (tilt > 0 ? 'iso' : 'top');
  const fov = state.fov ?? (mode === '3d' ? limits.fov : undefined);
  return {
    mode,
    center: { x: state.center.x, y: state.center.y },
    zoom: clampZoom(state.zoom),
    rotation: normalizeAngle(state.rotation ?? 0),
    tilt,
    ...(fov === undefined ? {} : { fov: Math.min(limits.fov, Math.max(FLAT_FOV, fov)) }),
  };
}

/**
 * État stable du mode, sans état de bascule : perspective pleine en 3D, orthographique sinon
 * (une bascule interrompue ne laisse pas une perspective intermédiaire), et en 2D ni rotation
 * ni inclinaison (nord en haut, à la verticale, comme draw.io).
 */
export function settleProjection(state: CameraState): CameraState {
  const { fov: _fov, ...rest } = state;
  if (state.mode === '3d') return { ...rest, fov: limits.fov };
  return state.mode === 'top' ? { ...rest, rotation: 0, tilt: 0 } : rest;
}

/** Avancement de la perspective : 0 en orthographique (ou `FLAT_FOV`), 1 en vue 3D. */
export function perspectiveAmount(state: Pick<CameraState, 'fov'>): number {
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
  options: { padding?: number; maxZoom?: number; rotation?: number; tilt?: number; mode?: ViewMode } = {},
): CameraState {
  const padding = options.padding ?? 40;
  const maxZoom = options.maxZoom ?? 1;
  const rotation = normalizeAngle(options.rotation ?? 0);
  const tilt = clampTilt(options.tilt ?? 0, options.mode);
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
  if (options.mode === '3d')
    return fitPerspective(bounds, viewport, { center, zoom, rotation, tilt, padding, maxZoom });
  return { mode: options.mode ?? (tilt > 0 ? 'iso' : 'top'), center, zoom: clampZoom(zoom), rotation, tilt };
}

/**
 * Cadrage en perspective : le zoom change aussi la déformation (la caméra avance), on part du
 * cadrage orthographique et on corrige jusqu'à ce que les coins projetés tiennent à l'écran.
 */
function fitPerspective(
  bounds: Rect,
  viewport: Viewport,
  fit: { center: Point; zoom: number; rotation: number; tilt: number; padding: number; maxZoom: number },
): CameraState {
  const availableWidth = Math.max(viewport.width - 2 * fit.padding, 1);
  const availableHeight = Math.max(viewport.height - 2 * fit.padding, 1);
  const corners = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x, y: bounds.y + bounds.height },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
  ];
  let state: CameraState = {
    mode: '3d',
    center: fit.center,
    zoom: clampZoom(fit.zoom, '3d'),
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
    const zoom = clampZoom(Math.min(state.zoom * factor, fit.maxZoom), '3d');
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
): CameraState {
  const reference = withViewMode(
    { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 },
    mode,
    isoTilt,
    isoAzimuth,
  );
  return fitBounds(bounds, viewport, { rotation: reference.rotation, tilt: reference.tilt, mode });
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
    Math.abs(a.tilt - b.tilt) * size < tolerancePx &&
    Math.abs((a.fov ?? 0) - (b.fov ?? 0)) * size < tolerancePx
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
  placeCamera(camera, state, distance);
  camera.updateProjectionMatrix();
}

/** Applique l'état (avec `fov`) à une caméra en perspective, placée à la distance qui donne le zoom au centre. */
export function applyPerspectiveState(camera: PerspectiveCamera, state: CameraState, viewport: Viewport): void {
  const fov = state.fov ?? limits.fov;
  const distance = focalLength(fov, viewport) / state.zoom;
  camera.fov = (fov * 180) / Math.PI;
  camera.aspect = viewport.width / viewport.height;
  // Le sol le plus lointain visible est à quelques distances (inclinaison bornée, §9.1).
  camera.near = Math.max(distance * 0.02, 0.01);
  camera.far = distance * 40 + 1000;
  placeCamera(camera, state, distance);
  camera.updateProjectionMatrix();
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
  if (state.fov !== undefined) return perspectiveScreenToPage(state, viewport, screen, height);
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
  if (state.fov !== undefined) return perspectivePageToScreen(state, viewport, page, height);
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
function perspectiveScreenToPage(state: CameraState, viewport: Viewport, screen: Point, height: number): Point {
  const focal = focalLength(state.fov ?? limits.fov, viewport);
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

function perspectivePageToScreen(state: CameraState, viewport: Viewport, page: Point, height: number): Point {
  const focal = focalLength(state.fov ?? limits.fov, viewport);
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

/** Glisser de `from` à `to` (écran) : le point du sol attrapé sous `from` passe sous `to` (perspective comprise). */
export function dragGround(state: CameraState, viewport: Viewport, from: Point, to: Point): CameraState {
  if (state.fov === undefined) return panByScreen(state, { x: to.x - from.x, y: to.y - from.y });
  const grabbed = screenToPage(state, viewport, from);
  return { ...state, center: centerKeeping(state, viewport, grabbed, to) };
}

/** Zoom multiplicatif en gardant fixe le point de la page sous `screen` (molette centrée sur le curseur). */
export function zoomAt(state: CameraState, viewport: Viewport, screen: Point, factor: number): CameraState {
  const anchor = screenToPage(state, viewport, screen);
  const zoomed = { ...state, zoom: clampZoom(state.zoom * factor, state.mode) };
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
  const tilted = { ...state, tilt: clampTilt(state.tilt + delta, state.mode) };
  return { ...tilted, center: centerKeeping(tilted, viewport, anchor, screen) };
}

/**
 * Orbite autour du centre de l'écran (glisser clic droit, iso et 3D), comme dans un jeu de
 * construction. `rotate` tourne autour de la verticale, `tilt` incline (borné selon le mode).
 */
export function orbit(state: CameraState, rotate: number, tilt: number): CameraState {
  return {
    ...state,
    rotation: normalizeAngle(state.rotation + rotate),
    tilt: clampTilt(state.tilt + tilt, state.mode),
  };
}

/**
 * Même vue, autre mode (le centre de l'écran ne bouge pas). La 2D n'est jamais tournée (nord en
 * haut, comme draw.io). L'iso part de son orientation de référence (`isoAzimuth`, ±45° pour
 * l'isométrie vraie) en venant de la 2D ou de la 3D ; la 3D garde l'orientation de l'iso, et part
 * de l'azimut iso en venant de la 2D. Rester dans le même mode garde la rotation choisie.
 */
export function withViewMode(state: CameraState, mode: ViewMode, isoTilt: number, isoAzimuth = 0): CameraState {
  const { fov: _fov, ...base } = state;
  if (mode === 'top') return { ...base, mode, rotation: 0, tilt: 0 };
  const rotation =
    state.mode === 'top' || (mode === 'iso' && state.mode === '3d') ? normalizeAngle(isoAzimuth) : state.rotation;
  if (mode === '3d') {
    const tilt = clampTilt(state.mode === '3d' ? state.tilt : isoTilt, '3d');
    return { ...base, mode, rotation, tilt, zoom: clampZoom(state.zoom, '3d'), fov: limits.fov };
  }
  return { ...base, mode, rotation, tilt: clampTilt(isoTilt, mode) };
}
