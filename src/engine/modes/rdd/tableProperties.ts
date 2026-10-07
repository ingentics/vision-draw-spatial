import type { ShapeModel } from '../../model/types';
import { spatialValue } from '../../spatial';
import type { ModeEdit, ModeProperty, ModeTarget } from '../types';
import { tableFields } from './fieldModel';
import { addDivider, setSecondary } from './operations';
import type { TableKind, TableOptionKey } from './tableKinds';
import { tableKindOf } from './tableKinds';
import { SECONDARY } from './tableLayout';
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

/**
 * Option d'une table (au format de `FIELD_OPTIONS`) : case à cocher écrite dans l'attribut `attribute` (`1`), permise
 * par `on` ; `write` : son effet, à la place de la seule écriture de l'attribut.
 */
export interface TableOption {
  key: TableOptionKey;
  type: 'flag';
  attribute: string;
  label: string;
  title: string;
  on(table: TableKind): boolean;
  write?(edit: ModeEdit, shape: ShapeModel, value: boolean): void;
}

/** Options d'une table, dans l'ordre du panneau. */
export const TABLE_OPTIONS: readonly TableOption[] = [
  {
    key: 'secondary',
    type: 'flag',
    attribute: SECONDARY,
    label: 'Table secondaire',
    title: 'Table secondaire (spatial.secondary) : 20 % plus petite',
    on: (table) => table.rules.options.includes('secondary'),
    // Taille × 0,8, entête et taille du nom dans le style (sujet 179).
    write: setSecondary,
  },
];

/** Table sélectionnée qui permet l'option. */
function optionTable(option: TableOption, target: ModeTarget): ShapeModel | undefined {
  const shape = tableOf(target);
  const table = shape && tableKindOf(shape);
  return shape && table && option.on(table) ? shape : undefined;
}

/** Réglage du panneau d'une option de table : masqué là où sa règle `on` ne la permet pas. */
const tableOptionProperty = (option: TableOption): ModeProperty => ({
  type: 'toggle',
  key: option.attribute,
  label: option.label,
  title: option.title,
  value: (_page, target) => {
    const shape = optionTable(option, target);
    return shape && spatialValue(shape, option.attribute) === '1' ? '1' : undefined;
  },
  write: (edit, target, value) => {
    const shape = optionTable(option, target);
    if (!shape) return;
    if (option.write) option.write(edit, shape, value === '1');
    else edit.setElementAttribute(shape.id, option.attribute, value === '1' ? '1' : undefined);
  },
  hidden: (_page, target) => !optionTable(option, target),
});

/** Réglages de la table, avant ceux de la ligne sélectionnée. */
export const TABLE_PROPERTIES: ModeProperty[] = [
  ...TABLE_OPTIONS.map(tableOptionProperty),
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
      return !shape || !tableKindOf(shape)?.rules.primaryKey;
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
