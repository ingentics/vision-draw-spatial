import type { Point } from '../../model/types';
import { DEFAULT_CONTROLS } from './settings';
import type { ControlSettings } from './settings';

/** Déplacement et rotation de la vue : touches, molette, inertie (calculs purs). */

/**
 * Sens de rotation au clavier, par position physique : la touche à gauche de Z / W (A en AZERTY,
 * Q en QWERTY) fait pivoter la vue vers la gauche, E vers la droite ; les deux s'annulent. Le signe
 * est celui de `CameraState.rotation`.
 */
export function keyRotation(pressed: Iterable<string>): number {
  const keys = new Set(pressed);
  return (keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0);
}

/** Vitesse angulaire (degrés / s) sous laquelle la rotation glissée s'arrête. */
const STOP_SPIN = 3;

/** Décélération exponentielle d'une vitesse angulaire (degrés / s) sur `dt` secondes, comme `decelerate`. */
export function decelerateSpin(spin: number, dt: number, decelerationMs: number): number {
  if (decelerationMs <= 0) return 0;
  const next = spin * Math.exp(-(dt * 1000) / decelerationMs);
  return Math.abs(next) < STOP_SPIN ? 0 : next;
}

export const ROTATE_CODES = ['KeyQ', 'KeyE'];

/** Décélération exponentielle de la vitesse sur `dt` secondes, arrêtée sous `stopSpeed` (px / s). */
export function decelerate(
  velocity: Point,
  dt: number,
  decelerationMs: number,
  stopSpeed = DEFAULT_CONTROLS.stopSpeed,
): Point {
  if (decelerationMs <= 0) return { x: 0, y: 0 };
  const k = Math.exp(-(dt * 1000) / decelerationMs);
  const next = { x: velocity.x * k, y: velocity.y * k };
  return Math.hypot(next.x, next.y) < stopSpeed ? { x: 0, y: 0 } : next;
}

/**
 * Vitesse du pointeur au relâchement (pixels écran / s), d'après ses dernières positions.
 * Nulle si le pointeur était immobile juste avant de relâcher.
 */
export function releaseVelocity(
  samples: Array<{ t: number; p: Point }>,
  now: number,
  options: { windowMs: number; maxSpeed: number } = {
    windowMs: DEFAULT_CONTROLS.releaseWindowMs,
    maxSpeed: DEFAULT_CONTROLS.maxReleaseSpeed,
  },
): Point {
  const recent = samples.filter((s) => now - s.t <= options.windowMs);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || last.t - first.t < 1) return { x: 0, y: 0 };
  const dt = (last.t - first.t) / 1000;
  const v = { x: (last.p.x - first.p.x) / dt, y: (last.p.y - first.p.y) / dt };
  const speed = Math.hypot(v.x, v.y);
  const max = options.maxSpeed;
  return speed > max ? { x: (v.x / speed) * max, y: (v.y / speed) * max } : v;
}

const LETTER_KEYS: Record<string, Point> = {
  KeyW: { x: 0, y: -1 }, // Z sur AZERTY
  KeyA: { x: -1, y: 0 }, // Q sur AZERTY
  KeyS: { x: 0, y: 1 },
  KeyD: { x: 1, y: 0 },
};
export const ARROW_KEYS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowRight: { x: 1, y: 0 },
};

/** Direction de déplacement à l'écran pour un ensemble de touches enfoncées (vecteur normalisé ou nul). */
export function keyDirection(pressed: Iterable<string>, moveKeys: ControlSettings['moveKeys']): Point {
  const maps =
    moveKeys === 'letters' ? [LETTER_KEYS] : moveKeys === 'arrows' ? [ARROW_KEYS] : [LETTER_KEYS, ARROW_KEYS];
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    for (const map of maps) {
      const d = map[code];
      if (d) {
        x += d.x;
        y += d.y;
      }
    }
  }
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** Variation de zoom pour un événement molette (lignes / pages ramenées en pixels ; pincement trackpad amplifié). */
export function wheelZoomFactor(
  event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>,
  zoomSpeed: number,
  viewportHeight: number,
): number {
  const pixels =
    event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * viewportHeight : event.deltaY;
  const speed = event.ctrlKey ? zoomSpeed * 10 : zoomSpeed;
  return Math.exp(-pixels * speed);
}

/** Touche de déplacement, selon le réglage `moveKeys`. */
export function isMoveKey(code: string, moveKeys: ControlSettings['moveKeys']): boolean {
  const d = keyDirection([code], moveKeys);
  return d.x !== 0 || d.y !== 0;
}
