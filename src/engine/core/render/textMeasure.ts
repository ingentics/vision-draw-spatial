import { approximateMeasure } from './richLayout';
import type { MeasureText } from './richLayout';

/**
 * Mesure immédiate d'un texte d'un moteur (sujet 377), pour une géométrie qui suit la largeur d'un texte (ex. onglet
 * d'une région RDD, sujet 228) : une approximation, puis celle des polices du texte SDF une fois chargées (`settle`,
 * le moteur reconstruit alors ses scènes). Propre à chaque moteur : deux moteurs d'une page ne partagent pas leurs
 * polices chargées.
 */
export class TextMeasure {
  private exact: MeasureText | undefined;

  /** Largeur du texte en pixels de page ; fonction stable, remise aux formes et aux modes (`measureText`). */
  readonly measure: MeasureText = (text, font) => (this.exact ?? approximateMeasure)(text, font);

  /** Polices chargées : la mesure devient la leur. */
  settle(measure: MeasureText): void {
    this.exact = measure;
  }

  /** La mesure est-elle celle des polices chargées (et non l'approximation) ? */
  get isExact(): boolean {
    return this.exact !== undefined;
  }
}
