import { DEFAULT_CONTROLS, DEFAULT_SHORTCUTS } from '../../interaction/controls';
import type { ControlSettings } from '../../interaction/controls';
import { FOLLOW_LINK_GESTURES, FOLLOW_LINK_KEYS, MULTI_SELECT_KEYS } from '../../interaction/selectionRules';
import { code, flag, number, oneOf } from '../fields';
import type { Spec } from '../fields';
import type { AccessibilitySettings, PreloadSettings, TransitionSettings } from '../types';

/** Schéma des réglages de navigation : transitions, préchargement, contrôles, accessibilité. */

const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const MOVE_KEYS = ['letters', 'arrows', 'all'] as const;
const REDUCED_MOTION = ['system', 'always', 'never'] as const;

export const TRANSITION = {
  enabled: flag(true),
  durationMs: number(500, { min: 0, max: 5000, step: 50 }),
  easing: oneOf(EASINGS, 'ease-in-out'),
  fadeStart: number(0.25, { min: 0, max: 1, step: 0.05 }),
  fadeEnd: number(0.75, { min: 0, max: 1, step: 0.05 }),
} satisfies Spec<TransitionSettings>;

export const PRELOAD = {
  onClick: flag(true),
  onHover: flag(false),
  hoverDelayMs: number(300, { min: 50, max: 3000, step: 50 }),
  maxCachedPages: number(8, { min: 1, max: 64, step: 1 }, { integer: true }),
} satisfies Spec<PreloadSettings>;

/** Valeurs par défaut tenues par les contrôles eux-mêmes (`DEFAULT_CONTROLS`), qui s'en servent sans paramètres. */
const d = DEFAULT_CONTROLS;
export const CONTROLS = {
  moveKeys: oneOf(MOVE_KEYS, d.moveKeys),
  moveSpeed: number(d.moveSpeed, { min: 50, max: 5000, step: 50 }),
  zoomSpeed: number(d.zoomSpeed, { min: 0.0002, max: 0.01, step: 0.0001 }),
  decelerationMs: number(d.decelerationMs, { min: 0, max: 600, step: 10 }),
  orbitSpeed: number(d.orbitSpeed, { min: 0.001, max: 0.02, step: 0.0005 }),
  multiSelectKey: oneOf(MULTI_SELECT_KEYS, d.multiSelectKey),
  followLinkKey: oneOf(FOLLOW_LINK_KEYS, d.followLinkKey),
  followLinkGesture: oneOf(FOLLOW_LINK_GESTURES, d.followLinkGesture),
  rotateSpeed: number(d.rotateSpeed, { min: 15, max: 360, step: 5 }),
  clickSlop: number(d.clickSlop, { min: 1, max: 20, step: 1 }),
  maxReleaseSpeed: number(d.maxReleaseSpeed, { min: 500, max: 10000, step: 100 }),
  releaseWindowMs: number(d.releaseWindowMs, { min: 20, max: 300, step: 10 }),
  stopSpeed: number(d.stopSpeed, { min: 1, max: 100, step: 1 }),
  shortcuts: {
    toggleViewMode: code(DEFAULT_SHORTCUTS.toggleViewMode),
    toggle3d: code(DEFAULT_SHORTCUTS.toggle3d),
    toggleGraph: code(DEFAULT_SHORTCUTS.toggleGraph),
    toggleMinimap: code(DEFAULT_SHORTCUTS.toggleMinimap),
    toggleMinigraph: code(DEFAULT_SHORTCUTS.toggleMinigraph),
    toggleFlatten: code(DEFAULT_SHORTCUTS.toggleFlatten),
    overview: code(DEFAULT_SHORTCUTS.overview),
    deleteSelection: code(DEFAULT_SHORTCUTS.deleteSelection),
    placementVariant: code(DEFAULT_SHORTCUTS.placementVariant),
    editComment: code(DEFAULT_SHORTCUTS.editComment),
  },
} satisfies Spec<ControlSettings>;

export const ACCESSIBILITY = {
  reducedMotion: oneOf(REDUCED_MOTION, 'system'),
} satisfies Spec<AccessibilitySettings>;
