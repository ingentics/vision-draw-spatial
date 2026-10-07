import { approximateMeasure } from './richLayout';
import type { FontSpec, MeasureText } from './richLayout';

/**
 * Mesure immédiate d'un texte, pour une géométrie qui suit la largeur d'un texte (ex. onglet d'une région RDD, sujet
 * 228) : celle des polices du texte SDF une fois chargées (`setTextMeasure`, posée par le moteur, qui reconstruit
 * alors ses scènes), une approximation avant (et sans DOM).
 */
let current: MeasureText | undefined;

export function setTextMeasure(measure: MeasureText | undefined): void {
  current = measure;
}

/** La mesure est-elle celle des polices chargées (et non l'approximation) ? */
export function hasExactTextMeasure(): boolean {
  return current !== undefined;
}

/** Largeur du texte en pixels de page. */
export function measureText(text: string, font: FontSpec): number {
  return (current ?? approximateMeasure)(text, font);
}
