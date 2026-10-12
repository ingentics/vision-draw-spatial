import type { Rect } from '../../../core/plugins';

/**
 * Ordre de lecture du mur (sujets 514, 518) : de haut en bas, puis de gauche à droite, d'après le coin haut-gauche des
 * bornes (post-it, groupes).
 */
export const byReading = (a: { bounds: Rect }, b: { bounds: Rect }): number =>
  a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x;
