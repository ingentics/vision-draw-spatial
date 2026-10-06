import type { FollowLinkGesture, FollowLinkKey, MultiSelectKey } from '../selection';
import { DEFAULT_SHORTCUTS } from './shortcuts';
import type { Shortcuts } from './shortcuts';

/** Réglages des contrôles de navigation (SPEC §9.2). */

export interface ControlSettings {
  /** Touches de déplacement : lettres (ZQSD / WASD selon le clavier), flèches, ou les deux. */
  moveKeys: 'letters' | 'arrows' | 'all';
  /** Vitesse de déplacement au clavier, en pixels écran par seconde. */
  moveSpeed: number;
  /** Sensibilité de la molette. */
  zoomSpeed: number;
  shortcuts: Shortcuts;
  /**
   * Glissade à l'arrêt d'un déplacement (clavier ou glisser) : constante de temps de la
   * décélération, en ms. Pas d'accélération au départ. 0 = arrêt net.
   */
  decelerationMs: number;
  /** Sensibilité de l'orbite au glisser clic droit (iso, 3D), en radians par pixel écran. */
  orbitSpeed: number;
  /** Touche qui, maintenue pendant un clic, ajoute l'élément à la sélection ou l'en retire. */
  multiSelectKey: MultiSelectKey;
  /** Touche à maintenir pour suivre un lien ('none' : double-clic seul). */
  followLinkKey: FollowLinkKey;
  /** Geste pour suivre un lien, avec la touche : clic simple ou double-clic. */
  followLinkGesture: FollowLinkGesture;
  /** Rotation au clavier (A / E en AZERTY, Q / E en QWERTY), en iso et en 3D, en degrés par seconde. */
  rotateSpeed: number;
  /** Déplacement du pointeur au-delà duquel un clic devient un glisser, en pixels écran. */
  clickSlop: number;
  /** Vitesse maximale transmise par un glisser rapide, en pixels écran par seconde. */
  maxReleaseSpeed: number;
  /** Fenêtre de mesure de la vitesse au relâchement d'un glisser, en ms. */
  releaseWindowMs: number;
  /** Vitesse en dessous de laquelle la glissade s'arrête, en pixels écran par seconde. */
  stopSpeed: number;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  moveKeys: 'all',
  moveSpeed: 600,
  zoomSpeed: 0.0015,
  decelerationMs: 80,
  orbitSpeed: 0.005,
  multiSelectKey: 'ctrl',
  followLinkKey: 'space',
  followLinkGesture: 'click',
  rotateSpeed: 90,
  clickSlop: 4,
  maxReleaseSpeed: 3000,
  releaseWindowMs: 80,
  stopSpeed: 8,
  shortcuts: DEFAULT_SHORTCUTS,
};
