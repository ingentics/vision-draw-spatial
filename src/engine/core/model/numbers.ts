/**
 * `value` ramené dans [`min`, `max`]. Si `min` dépasse `max`, le minimum l'emporte (`Math.max(min, Math.min(max, value))`,
 * l'écriture qu'avaient les plugins avant de partager cette brique).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
