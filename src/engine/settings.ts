import { ISOMETRIC_ELEVATION_DEG } from './interaction/camera';
import { DEFAULT_CONTROLS } from './interaction/controls';
import type { ControlSettings, Shortcuts } from './interaction/controls';

/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

/** Transition entre pages par un lien (SPEC §11.2). */
export interface TransitionSettings {
  enabled: boolean;
  durationMs: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/** Préchargement de la page cible d'un lien (SPEC §11.1) et cache des scènes. */
export interface PreloadSettings {
  onClick: boolean;
  onHover: boolean;
  hoverDelayMs: number;
  maxCachedPages: number;
}

/** Modes de vue (SPEC §9.1). */
export interface ViewSettings {
  defaultMode: 'top' | 'iso';
  /** Élévation de la caméra au-dessus du sol en mode iso, en degrés (35,26 = isométrie vraie). */
  isoAngleDeg: number;
  /**
   * Rotation ajoutée en passant en iso, en degrés : ±45 = isométrie vraie (vers la droite ou la
   * gauche), 0 = simple inclinaison.
   */
  isoAzimuthDeg: number;
  /** Durée de la bascule 2D ↔ iso. */
  switchDurationMs: number;
  /** Formes en volume en vue iso (blocs) ; sinon tout reste à plat. */
  isoVolume: boolean;
  /** Épaisseur par défaut des volumes, en pixels de page (`spatial.height` par forme). */
  isoDepth: number;
}

export interface MinimapSettings {
  visible: boolean;
  /** Largeur en pixels CSS (la hauteur suit les proportions de la page). */
  size: number;
}

/** Contour de sélection (SPEC §11.1). */
export interface SelectionSettings {
  /** Tirets qui défilent lentement le long du contour (« fourmis »). */
  animated: boolean;
  /** Vitesse de défilement, en pixels écran par seconde. */
  speed: number;
}

export interface DebugSettings {
  /** Bouton et panneau « Diagnostics » (styles non supportés, SPEC §8.4). */
  showUnsupportedPanel: boolean;
}

export interface AccessibilitySettings {
  /** Réduire les animations : selon le système (`prefers-reduced-motion`), toujours, ou jamais. */
  reducedMotion: 'system' | 'always' | 'never';
}

export interface Settings {
  transition: TransitionSettings;
  preload: PreloadSettings;
  controls: ControlSettings;
  view: ViewSettings;
  minimap: MinimapSettings;
  selection: SelectionSettings;
  debug: DebugSettings;
  accessibility: AccessibilitySettings;
}

/** Modification partielle, section par section (raccourcis compris). */
export type SettingsPatch = {
  [K in keyof Settings]?: K extends 'controls'
    ? Partial<Omit<ControlSettings, 'shortcuts'>> & { shortcuts?: Partial<Shortcuts> }
    : Partial<Settings[K]>;
};

export const DEFAULT_SETTINGS: Settings = {
  transition: { enabled: true, durationMs: 1000, easing: 'ease-in-out' },
  preload: { onClick: true, onHover: false, hoverDelayMs: 300, maxCachedPages: 8 },
  controls: DEFAULT_CONTROLS,
  view: {
    defaultMode: 'top',
    isoAngleDeg: ISOMETRIC_ELEVATION_DEG,
    isoAzimuthDeg: -45,
    switchDurationMs: 450,
    isoVolume: true,
    isoDepth: 16,
  },
  minimap: { visible: true, size: 200 },
  selection: { animated: true, speed: 12 },
  debug: { showUnsupportedPanel: true },
  accessibility: { reducedMotion: 'system' },
};

/** Bornes des réglages numériques (et pas des curseurs de l'UI). */
export const SETTINGS_LIMITS = {
  'transition.durationMs': { min: 0, max: 5000, step: 50 },
  'preload.hoverDelayMs': { min: 50, max: 3000, step: 50 },
  'preload.maxCachedPages': { min: 1, max: 64, step: 1 },
  'controls.moveSpeed': { min: 50, max: 5000, step: 50 },
  'controls.zoomSpeed': { min: 0.0002, max: 0.01, step: 0.0001 },
  'controls.rotateSpeed': { min: 0.001, max: 0.03, step: 0.001 },
  'controls.decelerationMs': { min: 0, max: 600, step: 10 },
  'view.isoAngleDeg': { min: 10, max: 80, step: 1 },
  'view.isoAzimuthDeg': { min: -90, max: 90, step: 1 },
  'view.switchDurationMs': { min: 0, max: 3000, step: 50 },
  'view.isoDepth': { min: 2, max: 120, step: 1 },
  'minimap.size': { min: 120, max: 400, step: 10 },
  'selection.speed': { min: 2, max: 80, step: 1 },
} as const;

const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const MOVE_KEYS = ['letters', 'arrows', 'all'] as const;
const MIDDLE_DRAG = ['pan', 'rotate'] as const;
const VIEW_MODES = ['top', 'iso'] as const;
const REDUCED_MOTION = ['system', 'always', 'never'] as const;

/**
 * Fusionne une modification dans des paramètres. Les valeurs invalides (mauvais type, hors liste)
 * sont ignorées, les nombres sont ramenés dans leurs bornes : un stockage abîmé ou ancien ne peut
 * pas casser l'application.
 */
export function mergeSettings(base: Settings, patch: SettingsPatch | undefined): Settings {
  const p = patch ?? {};
  const num = (key: keyof typeof SETTINGS_LIMITS, value: unknown, fallback: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    const { min, max } = SETTINGS_LIMITS[key];
    return Math.min(max, Math.max(min, value));
  };
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
    list.includes(value as T) ? (value as T) : fallback;
  const code = (value: unknown, fallback: string) => (typeof value === 'string' && value.length > 0 ? value : fallback);

  const t = p.transition ?? {};
  const pr = p.preload ?? {};
  const c = p.controls ?? {};
  const v = p.view ?? {};
  const m = p.minimap ?? {};
  const shortcuts = c.shortcuts ?? {};
  return {
    transition: {
      enabled: bool(t.enabled, base.transition.enabled),
      durationMs: num('transition.durationMs', t.durationMs, base.transition.durationMs),
      easing: oneOf(EASINGS, t.easing, base.transition.easing),
    },
    preload: {
      onClick: bool(pr.onClick, base.preload.onClick),
      onHover: bool(pr.onHover, base.preload.onHover),
      hoverDelayMs: num('preload.hoverDelayMs', pr.hoverDelayMs, base.preload.hoverDelayMs),
      maxCachedPages: Math.round(num('preload.maxCachedPages', pr.maxCachedPages, base.preload.maxCachedPages)),
    },
    controls: {
      moveKeys: oneOf(MOVE_KEYS, c.moveKeys, base.controls.moveKeys),
      middleDrag: oneOf(MIDDLE_DRAG, c.middleDrag, base.controls.middleDrag),
      moveSpeed: num('controls.moveSpeed', c.moveSpeed, base.controls.moveSpeed),
      zoomSpeed: num('controls.zoomSpeed', c.zoomSpeed, base.controls.zoomSpeed),
      rotateSpeed: num('controls.rotateSpeed', c.rotateSpeed, base.controls.rotateSpeed),
      decelerationMs: num('controls.decelerationMs', c.decelerationMs, base.controls.decelerationMs),
      shortcuts: {
        toggleViewMode: code(shortcuts.toggleViewMode, base.controls.shortcuts.toggleViewMode),
        toggleGraph: code(shortcuts.toggleGraph, base.controls.shortcuts.toggleGraph),
        toggleMinimap: code(shortcuts.toggleMinimap, base.controls.shortcuts.toggleMinimap),
        overview: code(shortcuts.overview, base.controls.shortcuts.overview),
        back: code(shortcuts.back, base.controls.shortcuts.back),
      },
    },
    view: {
      defaultMode: oneOf(VIEW_MODES, v.defaultMode, base.view.defaultMode),
      isoAngleDeg: num('view.isoAngleDeg', v.isoAngleDeg, base.view.isoAngleDeg),
      isoAzimuthDeg: num('view.isoAzimuthDeg', v.isoAzimuthDeg, base.view.isoAzimuthDeg),
      switchDurationMs: num('view.switchDurationMs', v.switchDurationMs, base.view.switchDurationMs),
      isoVolume: bool(v.isoVolume, base.view.isoVolume),
      isoDepth: num('view.isoDepth', v.isoDepth, base.view.isoDepth),
    },
    minimap: {
      visible: bool(m.visible, base.minimap.visible),
      size: num('minimap.size', m.size, base.minimap.size),
    },
    selection: {
      animated: bool(p.selection?.animated, base.selection.animated),
      speed: num('selection.speed', p.selection?.speed, base.selection.speed),
    },
    debug: { showUnsupportedPanel: bool(p.debug?.showUnsupportedPanel, base.debug.showUnsupportedPanel) },
    accessibility: {
      reducedMotion: oneOf(REDUCED_MOTION, p.accessibility?.reducedMotion, base.accessibility.reducedMotion),
    },
  };
}

/** Faut-il réduire les animations ? (`systemPrefersReduced` = `prefers-reduced-motion: reduce`). */
export function resolveReducedMotion(
  setting: AccessibilitySettings['reducedMotion'],
  systemPrefersReduced: boolean,
): boolean {
  return setting === 'always' || (setting === 'system' && systemPrefersReduced);
}
