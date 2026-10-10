import type { ModeProperty } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { keys, PIVOT } from '../keys';
import { EVENT } from '../kinds';

/**
 * Réglage « Pivot » d'un Domain Event (sujet 515) : quelqu'un d'autre prend-il le relais après l'événement ? Oui par
 * défaut, seul Non est écrit (`spatial.es.pivot=0`).
 */

const YES = '1';
const NO = '0';

export const PIVOT_PROPERTY: ModeProperty = {
  type: 'choice',
  key: PIVOT,
  section: 'Pivot',
  label:
    'Une fois que cet événement a eu lieu, est-ce que quelqu’un d’autre prend le relais, avec ses propres règles, sans avoir besoin de savoir comment on en est arrivé là ?',
  title: 'Événement pivot : un autre prend le relais sans connaître ce qui précède (spatial.es.pivot=0 pour Non)',
  help: 'Exemple : « Paiement refusé » est pivotal (la relance n’a pas besoin de connaître le prestataire), « Client prévenu » ne l’est pas (personne ne prend le relais). Si la réponse hésite, notez-le comme hotspot.',
  buttons: true,
  options: () => [
    { value: YES, label: 'Oui', title: 'Pivot : un autre prend le relais (attribut retiré)' },
    { value: NO, label: 'Non', title: 'Pas pivot : personne ne prend le relais (spatial.es.pivot=0)' },
  ],
  value: (_page, target) => {
    const shape = shapeTarget(target);
    return shape && (keys.value(shape, PIVOT) === NO ? NO : YES);
  },
  write: (edit, target, value) => edit.setElementAttribute(target.id, PIVOT, value === NO ? NO : undefined),
  hidden: (_page, target) => shapeTarget(target)?.kind !== EVENT.kind,
};
