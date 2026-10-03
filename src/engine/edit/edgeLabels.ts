import type { EdgeLabelModel, EdgeModel } from '../model/types';

/**
 * Textes de début et de fin d'une flèche (SPEC §14.1) : labels enfants de l'arête, près de la source
 * ou de la cible. Un label dont la position (−1 = source, 1 = cible) dépasse ±0,5 compte comme texte
 * de début ou de fin ; le plus proche du bout l'emporte.
 */

export type EdgeEnd = 'start' | 'end';

/** Position des textes créés : 10 % de la longueur depuis le bout, hors de la pointe et de la forme. */
export const END_LABEL_POSITION = 0.8;
const END_THRESHOLD = 0.5;

export function endLabelOf(edge: EdgeModel, end: EdgeEnd): EdgeLabelModel | undefined {
  const sign = end === 'start' ? -1 : 1;
  return edge.labels
    .filter((label) => label.placement.position * sign >= END_THRESHOLD)
    .sort((a, b) => b.placement.position * sign - a.placement.position * sign)[0];
}

/** Bout de la flèche visé par une position le long du tracé (-1…1) ; undefined = vers le milieu. */
export function endAt(position: number): EdgeEnd | undefined {
  if (position <= -END_THRESHOLD) return 'start';
  if (position >= END_THRESHOLD) return 'end';
  return undefined;
}

export function endLabelPosition(end: EdgeEnd): number {
  return end === 'start' ? -END_LABEL_POSITION : END_LABEL_POSITION;
}
