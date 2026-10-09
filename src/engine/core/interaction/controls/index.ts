/**
 * Contrôles de navigation (SPEC §9.2) : façade du dossier `controls/` (raccourcis, réglages, déplacement et inertie,
 * contrôleur souris et clavier).
 */

export { CameraController } from './CameraController';
export type { CameraHost, HeldKeys } from './host';
export { isPageKeyCandidate } from './keyboard';
export { decelerate, decelerateSpin, keyDirection, keyRotation, releaseVelocity, wheelZoomFactor } from './motion';
export { DEFAULT_CONTROLS } from './settings';
export type { ControlSettings } from './settings';
export { DEFAULT_SHORTCUTS, RESERVED_CODES, resolveShortcut, shortcutAction } from './shortcuts';
export type { Shortcuts } from './shortcuts';
