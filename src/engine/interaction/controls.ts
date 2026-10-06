/**
 * Contrôles de navigation (SPEC §9.2) : façade du dossier `controls/` (raccourcis, réglages, déplacement et inertie,
 * contrôleur souris et clavier).
 */

export { CameraController } from './controls/CameraController';
export type { CameraHost, HeldKeys } from './controls/host';
export {
  decelerate,
  decelerateSpin,
  keyDirection,
  keyRotation,
  releaseVelocity,
  wheelZoomFactor,
} from './controls/motion';
export { DEFAULT_CONTROLS } from './controls/settings';
export type { ControlSettings } from './controls/settings';
export { DEFAULT_SHORTCUTS, RESERVED_CODES, resolveShortcut, shortcutAction } from './controls/shortcuts';
export type { Shortcuts } from './controls/shortcuts';
