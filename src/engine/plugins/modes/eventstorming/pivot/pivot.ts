import type { ModeEdit, ModeProperty, ModeTarget, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { keys, PIVOT } from '../keys';
import { EVENT } from '../kinds';
import { verdictOf } from './pivotVerdict';
import type { Answers, Reply, Who } from './pivotVerdict';

/**
 * Pivot d'un Domain Event (sujets 515, 516, 517) : deux questions dans le panneau, dont les réponses sont
 * enregistrées sur le post-it, et un encadré de verdict. Le pivot en est déduit à chaque réponse : Oui
 * (`spatial.es.pivot=1`), Non (`0`), Je ne sais pas (`unknown`) ; absent : non défini, le défaut.
 */

const YES = '1';
const UNKNOWN = 'unknown';

/** Réponse à « Qui réagit ? » (`spatial.es.pivotWho`). */
const WHO = 'pivotWho';
/** Un autre métier : a-t-il besoin d'autre chose que l'événement ? (`spatial.es.pivotNeeds`) */
const NEEDS = 'pivotNeeds';
/** Le même métier ou personne : un métier absent de l'atelier a-t-il besoin de le savoir ? (`spatial.es.pivotAbsent`) */
const ABSENT = 'pivotAbsent';

const WHO_VALUES: readonly Who[] = ['other', 'same', 'none', 'unknown'];
const REPLY_VALUES: readonly Reply[] = ['yes', 'no', 'unknown'];

/** Icône d'une réponse (sujets 516, 517) : `spread` pour Oui, `question` pour Je ne sais pas. */
export type PivotMarkKind = 'spread' | 'question';

/** Icône que porte le post-it : celle de son pivot s'il est un Domain Event, sinon aucune. */
export function pivotMarkOf(shape: ShapeModel): PivotMarkKind | undefined {
  if (shape.kind !== EVENT.kind) return undefined;
  const pivot = keys.value(shape, PIVOT);
  return pivot === YES ? 'spread' : pivot === UNKNOWN ? 'question' : undefined;
}

/** Valeur lue si elle est une des réponses ; absente ou inconnue (fichier modifié à la main) : pas de réponse. */
function answerOf<T extends string>(shape: ShapeModel, key: string, values: readonly T[]): T | undefined {
  const value = keys.value(shape, key);
  return values.find((answer) => answer === value);
}

function answersOf(shape: ShapeModel): Answers {
  return {
    who: answerOf(shape, WHO, WHO_VALUES),
    needs: answerOf(shape, NEEDS, REPLY_VALUES),
    absent: answerOf(shape, ABSENT, REPLY_VALUES),
  };
}

const eventOf = (target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  return shape?.kind === EVENT.kind ? shape : undefined;
};

/** Réponse écrite, puis pivot déduit de toutes les réponses (gardé tel quel si le verdict le laisse inchangé). */
function answer(edit: ModeEdit, shape: ShapeModel, key: keyof Answers, attribute: string, value: string | undefined) {
  const values: readonly string[] = key === 'who' ? WHO_VALUES : REPLY_VALUES;
  const written = value && values.includes(value) ? value : undefined;
  edit.setElementAttribute(shape.id, attribute, written);
  const verdict = verdictOf({ ...answersOf(shape), [key]: written }, shape.label, keys.value(shape, PIVOT));
  if (verdict.pivot !== 'keep') edit.setElementAttribute(shape.id, PIVOT, verdict.pivot);
}

/** Question en boutons de la section « Pivot » ; sans réponse écrite, « On ne sait pas » est montré. */
function question(
  key: keyof Answers,
  attribute: string,
  label: string,
  help: string,
  options: { value: string; label: string; title: string }[],
  shown: (answers: Answers) => boolean,
): ModeProperty {
  return {
    type: 'choice',
    key: attribute,
    section: 'Pivot',
    label,
    title: `${label} (spatial.es.${attribute})`,
    help,
    buttons: true,
    options: () => options,
    value: (_page, target) => {
      const shape = eventOf(target);
      return (shape && answersOf(shape)[key]) ?? UNKNOWN;
    },
    write: (edit, target, value) => {
      const shape = eventOf(target);
      if (shape) answer(edit, shape, key, attribute, value);
    },
    hidden: (_page, target) => {
      const shape = eventOf(target);
      return !shape || !shown(answersOf(shape));
    },
  };
}

const dontKnow = (attribute: string) => ({
  value: UNKNOWN,
  label: 'On ne sait pas',
  title: `Réponse incertaine : à noter comme hotspot (spatial.es.${attribute}=unknown)`,
});

const WHO_PROPERTY = question(
  'who',
  WHO,
  'Qui réagit à cet événement sur le mur ?',
  'Regarde les policies et commandes qui suivent.',
  [
    { value: 'other', label: 'Un autre métier', title: 'Un autre métier réagit (spatial.es.pivotWho=other)' },
    { value: 'same', label: 'Le même métier', title: 'Le métier qui l’a produit poursuit (spatial.es.pivotWho=same)' },
    { value: 'none', label: 'Personne', title: 'Personne ne réagit sur le mur (spatial.es.pivotWho=none)' },
    dontKnow(WHO),
  ],
  () => true,
);

const NEEDS_PROPERTY = question(
  'needs',
  NEEDS,
  'Pour réagir, ont-ils besoin d’autre chose que l’événement ?',
  'Aller chercher une donnée chez le métier qui l’a produit, par exemple.',
  [
    { value: 'no', label: 'Non, il suffit', title: 'L’événement seul suffit (spatial.es.pivotNeeds=no)' },
    { value: 'yes', label: 'Oui', title: 'Il leur faut autre chose (spatial.es.pivotNeeds=yes)' },
    dontKnow(NEEDS),
  ],
  (answers) => answers.who === 'other',
);

const ABSENT_PROPERTY = question(
  'absent',
  ABSENT,
  'Un métier absent de l’atelier aurait-il besoin de le savoir ?',
  'Stock, compta, support, juridique…',
  [
    { value: 'yes', label: 'Oui', title: 'Un métier absent en a besoin (spatial.es.pivotAbsent=yes)' },
    { value: 'no', label: 'Non', title: 'Personne d’autre n’en a besoin (spatial.es.pivotAbsent=no)' },
    dontKnow(ABSENT),
  ],
  (answers) => answers.who === 'same' || answers.who === 'none',
);

/** Encadré du verdict, sous les questions. */
const VERDICT_PROPERTY: ModeProperty = {
  type: 'note',
  key: 'pivotVerdict',
  section: 'Pivot',
  label: 'Verdict du pivot',
  note: (_page, target) => {
    const shape = eventOf(target);
    return shape && verdictOf(answersOf(shape), shape.label, keys.value(shape, PIVOT)).note;
  },
  hidden: (_page, target) => !eventOf(target),
};

/** Section « Pivot » d'un Domain Event : questions, puis verdict. */
export const PIVOT_PROPERTIES: ModeProperty[] = [WHO_PROPERTY, NEEDS_PROPERTY, ABSENT_PROPERTY, VERDICT_PROPERTY];
