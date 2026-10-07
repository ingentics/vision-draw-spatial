import type { ModeEdit, ModeProperty, ModeTarget } from '../types';
import { tableFields } from './fieldModel';
import { addDivider, setSecondary } from './operations';
import { tableKindOf } from './tableKinds';
import { SECONDARY, isSecondary } from './tableLayout';
import { rowOf, tableOf } from './tableTargets';

/** Réglages d'une table RDD sélectionnée (sujets 179, 253, 260) : table secondaire, clé primaire, ajout d'un séparateur. */

const notTable = (_page: unknown, target: ModeTarget) => !tableOf(target);

/**
 * Séparateur ajouté après la ligne sélectionnée, sinon en fin de liste (sujet 253) ; renvoie son rang, la partie à
 * sélectionner (son texte passe en édition). Partagé par le bouton du panneau et la touche « - ».
 */
export function addDividerAfter(edit: ModeEdit, target: ModeTarget, part: string | undefined): string | undefined {
  const shape = tableOf(target);
  const index = shape && addDivider(edit, shape, rowOf(target, part)?.index);
  return index === undefined ? undefined : String(index);
}

/** Réglages de la table, avant ceux de la ligne sélectionnée. */
export const TABLE_PROPERTIES: ModeProperty[] = [
  {
    type: 'toggle',
    key: SECONDARY,
    label: 'Table secondaire',
    title: 'Table secondaire (spatial.secondary) : 20 % plus petite',
    value: (_page, target) => {
      const shape = tableOf(target);
      return shape && isSecondary(shape) ? '1' : undefined;
    },
    write: (edit, target, value) => {
      const shape = tableOf(target);
      if (shape) setSecondary(edit, shape, value === '1');
    },
    hidden: notTable,
  },
  {
    type: 'text',
    key: 'rdd.primaryKey',
    label: 'Clé primaire',
    title: 'Clé primaire de la table : toujours le premier champ, ni retirée ni déplacée',
    readOnly: true,
    value: (_page, target) => {
      const shape = tableOf(target);
      return shape && tableFields(shape)[0]?.label;
    },
    hidden: (_page, target) => {
      const shape = tableOf(target);
      return !shape || !tableKindOf(shape)?.primaryKey;
    },
  },
];

/**
 * Tout en bas de l'encart, table ou ligne sélectionnée : un séparateur après la ligne (sinon en fin de liste),
 * sélectionné et son texte en édition (sujet 253).
 */
export const ADD_DIVIDER_PROPERTY: ModeProperty = {
  type: 'button',
  anyPart: true,
  key: 'rdd.addDivider',
  label: 'Ajouter un séparateur',
  title: 'Ajoute un séparateur après la ligne sélectionnée, sinon en fin de liste (touche « - » sur une ligne)',
  write: (edit, target, _value, part) => addDividerAfter(edit, target, part),
  hidden: notTable,
};
