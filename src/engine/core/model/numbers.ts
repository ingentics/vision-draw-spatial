/**
 * `value` ramené dans [`min`, `max`]. Si `min` dépasse `max`, le minimum l'emporte (`Math.max(min, Math.min(max, value))`,
 * l'écriture qu'avaient les plugins avant de partager cette brique).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Courbe ease-in-out cubique d'une animation : avancement `t` dans [0, 1] → valeur dans [0, 1]. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
