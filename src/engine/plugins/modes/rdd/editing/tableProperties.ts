import type { ModeEdit, ModeProperty, ModeTarget, ShapeModel } from '../../../../core/plugins';
import { isToggled, toggleValue } from '../../../../core/plugins';
import { PHYSICAL_LAYER, tableFields } from '../tables/fieldModel';
import { documentBody, hasBody, setBody } from '../tables/documentBody';
import { addDivider, setPhysicalName, setSecondary } from '../tables/operations';
import { DB_NAME } from '../tables/physicalLayer';
import type { TableKind, TableOptionKey } from '../tables/tableKinds';
import { tableKindOf } from '../tables/tableKinds';
import { MATERIALIZED, PRIVATE, SECONDARY } from '../tables/tableLayout';
import { rowOf, tableOf } from './tableTargets';
import { keys } from '../keys';

/**
 * Réglages d'une table RDD sélectionnée (sujets 179, 253, 260, 413) : nom en base, table secondaire, clé primaire, ajout
 * d'un séparateur.
 */

/** Cible qui n'est pas une table à champs (autre forme, document). */
const notFieldTable = (_page: unknown, target: ModeTarget) => {
  const shape = tableOf(target);
  return !shape || !tableKindOf(shape)?.rules.fields;
};

/** Document sélectionné (sujet 269). */
const documentOf = (target: ModeTarget) => {
  const shape = tableOf(target);
  return shape && hasBody(shape) ? shape : undefined;
};

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
  section?: string;
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
    title: 'Table secondaire (spatial.rdd.secondary) : 20 % plus petite',
    on: (table) => table.rules.options.includes('secondary'),
    // Taille × 0,8, entête et taille du nom dans le style (sujet 179).
    write: setSecondary,
  },
  {
    // Vue matérialisée (sujet 272) : CREATE MATERIALIZED VIEW.
    key: 'materialized',
    type: 'flag',
    attribute: MATERIALIZED,
    label: 'Matérialisé',
    title: 'Vue matérialisée (spatial.rdd.materialized) : CREATE MATERIALIZED VIEW',
    section: PHYSICAL_LAYER,
    on: (table) => table.rules.options.includes('materialized'),
  },
  {
    // Vue privée (sujet 342) : clé à gauche du nom.
    key: 'private',
    type: 'flag',
    attribute: PRIVATE,
    label: 'Privée',
    title: 'Vue privée (spatial.rdd.private) : clé à gauche du nom',
    on: (table) => table.rules.options.includes('private'),
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
  section: option.section,
  value: (_page, target) => {
    const shape = optionTable(option, target);
    return toggleValue(!!shape && keys.flag(shape, option.attribute));
  },
  write: (edit, target, value) => {
    const shape = optionTable(option, target);
    if (!shape) return;
    if (option.write) option.write(edit, shape, isToggled(value));
    else edit.setElementAttribute(shape.id, option.attribute, toggleValue(isToggled(value)));
  },
  hidden: (_page, target) => !optionTable(option, target),
});

/** Table sélectionnée qui a un nom en base (sujet 413). */
const physicalTable = (target: ModeTarget) => {
  const shape = tableOf(target);
  return shape && tableKindOf(shape)?.rules.physicalName ? shape : undefined;
};

/** Réglages de la table, avant ceux de la ligne sélectionnée. */
export const TABLE_PROPERTIES: ModeProperty[] = [
  {
    // Avant les options : premier de la section « Couche physique », devant « Matérialisé » d'une vue.
    type: 'text',
    key: DB_NAME,
    section: PHYSICAL_LAYER,
    label: 'Nom de la table',
    title: 'Nom de la table ou de la vue en base (spatial.rdd.dbName)',
    // La table a la place du nom en base, affiché en couche physique (sujet 414).
    write: (edit, target, value) => {
      const shape = physicalTable(target);
      if (shape) setPhysicalName(edit, shape, value);
    },
    hidden: (_page, target) => !physicalTable(target),
  },
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
  {
    // Corps d'un document (sujet 269) : tout le texte, avec ascenseurs au besoin.
    type: 'text',
    key: 'rdd.body',
    section: 'Document body',
    label: 'Texte',
    title: 'Corps du document en texte libre (spatial.rdd.body) ; ⌘ + Entrée pour valider, tabulations en deux espaces',
    multiline: true,
    monospace: true,
    value: (_page, target) => {
      const shape = documentOf(target);
      return shape && documentBody(shape);
    },
    write: (edit, target, value) => {
      const shape = documentOf(target);
      if (shape) setBody(edit, shape, value ?? '');
    },
    hidden: (_page, target) => !documentOf(target),
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
  hidden: notFieldTable,
};
