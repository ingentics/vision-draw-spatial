import { prunePath } from '../../../model/geometry';
import type { Point } from '../../../model/types';

/** Nettoyage d'un tracé : points confondus et points alignés intermédiaires. */

/**
 * Retire les points dupliqués et les points alignés intermédiaires, mais garde les demi-tours : un point
 * intermédiaire posé par l'utilisateur peut faire repartir le trait en arrière, et draw.io le dessine.
 */
export function simplify(points: Point[]): Point[] {
  return prunePath(points, 1e-6, true);
}
