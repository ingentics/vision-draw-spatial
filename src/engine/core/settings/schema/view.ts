import { ISOMETRIC_ELEVATION_DEG } from '../../interaction/cameraMath';
import { DEFAULT_DEPTH } from '../../spatial';
import { color, flag, number, oneOf } from '../fields';
import type { Spec } from '../fields';
import type {
  BackgroundSettings,
  CameraSettings,
  CommentSettings,
  GraphSettings,
  MinimapSettings,
  MinigraphSettings,
  SelectionSettings,
  ViewSettings,
} from '../types';

/** Schéma des réglages d'affichage : vues, caméra, fond, mini-carte, commentaire, sélection, vue graphe. */

const VIEW_MODES = ['top', 'iso', '3d'] as const;
const SELECTION_STYLES = ['veil', 'outline'] as const;

export const VIEW = {
  defaultMode: oneOf(VIEW_MODES, 'top'),
  isoAngleDeg: number(ISOMETRIC_ELEVATION_DEG, { min: 10, max: 80, step: 1 }),
  isoAzimuthDeg: number(-45, { min: -180, max: 180, step: 1 }),
  switchDurationMs: number(450, { min: 0, max: 3000, step: 50 }),
  isoVolume: flag(true),
  isoDepth: number(DEFAULT_DEPTH, { min: 2, max: 120, step: 1 }),
  shadeLight: number(0.9, { min: 0.3, max: 1.2, step: 0.02 }),
  shadeDark: number(0.62, { min: 0.2, max: 1.2, step: 0.02 }),
  facadeTags: flag(true),
} satisfies Spec<ViewSettings>;

export const CAMERA = {
  minZoom: number(0.05, { min: 0.01, max: 1, step: 0.01 }),
  maxZoom: number(16, { min: 1, max: 64, step: 1 }),
  minZoom3d: number(0.1, { min: 0.02, max: 1, step: 0.01 }),
  maxZoom3d: number(4, { min: 1, max: 16, step: 0.5 }),
  maxTilt3dDeg: number(65, { min: 10, max: 85, step: 1 }),
  fovDeg: number(45, { min: 15, max: 100, step: 1 }),
  animationMs: number(250, { min: 0, max: 2000, step: 25 }),
  focusMaxZoom: number(2, { min: 0.25, max: 8, step: 0.25 }),
  focusPadding: number(80, { min: 0, max: 300, step: 5 }),
} satisfies Spec<CameraSettings>;

/**
 * Caméra : bornes cohérentes (le minimum ne dépasse pas le maximum, même s'ils arrivent dans le désordre d'un
 * stockage ancien).
 */
export function orderedZooms(camera: CameraSettings): CameraSettings {
  return {
    ...camera,
    maxZoom: Math.max(camera.minZoom, camera.maxZoom),
    maxZoom3d: Math.max(camera.minZoom3d, camera.maxZoom3d),
  };
}

export const BACKGROUND = {
  color: color('#ffffff'),
  grid: flag(true),
  gridFromPage: flag(true),
  gridSize: number(10, { min: 2, max: 200, step: 1 }),
  majorEvery: number(4, { min: 1, max: 20, step: 1 }, { integer: true }),
  gridColor: color('#d4d9e0'),
  minorStrength: number(0.55, { min: 0, max: 1, step: 0.05 }),
} satisfies Spec<BackgroundSettings>;

export const MINIMAP = {
  visible: flag(true),
  size: number(200, { min: 120, max: 400, step: 10 }),
  edgeColor: color('#80868b'),
  outlineColor: color('#9aa0a6'),
} satisfies Spec<MinimapSettings>;

export const MINIGRAPH = {
  visible: flag(false),
} satisfies Spec<MinigraphSettings>;

export const COMMENT = {
  veilColor: color('#202124'),
  opacityCorner: number(0.75, { min: 0, max: 1, step: 0.05 }),
  opacityEdge: number(0.45, { min: 0, max: 1, step: 0.05 }),
  marginTop: number(50, { min: 0, max: 400, step: 5 }),
  marginRight: number(180, { min: 0, max: 400, step: 5 }),
  curveRadius: number(230, { min: 0, max: 600, step: 10 }),
  fadeLength: number(150, { min: 0, max: 400, step: 5 }),
  padding: number(40, { min: 0, max: 160, step: 2 }),
  textColor: color('#ffffff'),
  textSize: number(13, { min: 8, max: 32, step: 1 }),
  textMaxWidth: number(340, { min: 120, max: 900, step: 10 }),
  fadeInMs: number(220, { min: 0, max: 2000, step: 20 }),
  fadeOutMs: number(260, { min: 0, max: 2000, step: 20 }),
} satisfies Spec<CommentSettings>;

export const SELECTION = {
  style: oneOf(SELECTION_STYLES, 'veil'),
  veilOpacity: number(0.35, { min: 0.05, max: 0.85, step: 0.05 }),
  animated: flag(true),
  speed: number(4, { min: 2, max: 80, step: 1 }),
  veilColor: color('#202124'),
  veilPadding: number(10, { min: 0, max: 60, step: 1 }),
  accentColor: color('#1a73e8'),
} satisfies Spec<SelectionSettings>;

export const GRAPH = {
  nodeSize: number(64, { min: 24, max: 200, step: 4 }),
  nodeGap: number(50, { min: 0, max: 400, step: 10 }),
  layerGap: number(20, { min: 20, max: 600, step: 10 }),
  pairOffset: number(15, { min: 0, max: 60, step: 1 }),
  cardColor: color('#9aa0a6'),
  orphanColor: color('#d93025'),
  unreachableColor: color('#e37400'),
  arcColor: color('#5f6368'),
  titleColor: color('#202124'),
  transitionMs: number(0, { min: 0, max: 5000, step: 10 }),
} satisfies Spec<GraphSettings>;
