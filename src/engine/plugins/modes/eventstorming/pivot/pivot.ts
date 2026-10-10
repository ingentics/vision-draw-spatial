import type { ModeProperty, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { keys, PIVOT } from '../keys';
import { EVENT } from '../kinds';

/**
 * Réglage « Pivot » d'un Domain Event (sujets 515, 516) : quelqu'un d'autre prend-il le relais après l'événement ?
 * Oui (`spatial.es.pivot=1`), Non (`0`), Je ne sais pas (`unknown`) ; absent : non défini, le défaut.
 */

const YES = '1';
const NO = '0';
const UNKNOWN = 'unknown';
/** Non défini : valeur vide du choix, l'attribut est retiré. */
const UNSET = '';

const ANSWERS = [YES, NO, UNKNOWN];

/** Icône d'une réponse (sujet 516) : `spread` pour Oui, `warning` pour Je ne sais pas. */
export type PivotMarkKind = 'spread' | 'warning';

/** Icône que porte le post-it : celle de sa réponse s'il est un Domain Event, sinon aucune. */
export function pivotMarkOf(shape: ShapeModel): PivotMarkKind | undefined {
  if (shape.kind !== EVENT.kind) return undefined;
  const answer = keys.value(shape, PIVOT);
  return answer === YES ? 'spread' : answer === UNKNOWN ? 'warning' : undefined;
}

export const PIVOT_PROPERTY: ModeProperty = {
  type: 'choice',
  key: PIVOT,
  section: 'Pivot',
  label: 'Qui réagit à cet événement ? Est-ce le même domaine métier que celui qui l’a produit ?',
  title: 'Événement pivot : un autre prend le relais sans connaître ce qui précède (spatial.es.pivot)',
  help: 'Exemple : « Paiement refusé » est pivotal (la relance n’a pas besoin de connaître le prestataire), « Client prévenu » ne l’est pas (personne ne prend le relais). Si la réponse hésite, notez-le comme hotspot.',
  buttons: true,
  options: () => [
    { value: YES, label: 'Oui', title: 'Pivot : un autre prend le relais, icône sur le post-it (spatial.es.pivot=1)' },
    { value: NO, label: 'Non', title: 'Pas pivot : personne ne prend le relais (spatial.es.pivot=0)' },
    {
      value: UNKNOWN,
      label: 'Je ne sais pas',
      title: 'Réponse incertaine : à noter comme hotspot, icône d’alerte sur le post-it (spatial.es.pivot=unknown)',
    },
    { value: UNSET, label: 'Non défini', title: 'Pas encore de réponse (spatial.es.pivot retiré)' },
  ],
  // Une valeur inconnue (fichier modifié à la main) est montrée comme non définie.
  value: (_page, target) => {
    const shape = shapeTarget(target);
    const answer = shape && keys.value(shape, PIVOT);
    return answer && ANSWERS.includes(answer) ? answer : UNSET;
  },
  write: (edit, target, value) =>
    edit.setElementAttribute(target.id, PIVOT, value && ANSWERS.includes(value) ? value : undefined),
  hidden: (_page, target) => shapeTarget(target)?.kind !== EVENT.kind,
};
