import type { ModeProperty, ModeTarget } from '../../../../core/plugins';
import { isToggled, toggleValue, onlyWhen } from '../../../../core/plugins';
import type { FieldOption } from '../tables/fieldModel';
import { FIELD_OPTIONS, FIELD_TYPES, fieldTypeLabel, isDivider, isPrimaryKey, isRelation } from '../tables/fieldModel';
import { fieldParts } from './fieldParts';
import { setField } from '../tables/operations';
import { RELATION_FIELD_PROPERTIES, edgeOwnedField } from '../relations';
import { tableKindOf } from '../tables/tableKinds';
import { fieldOf, rowOf } from './tableTargets';

/**
 * Réglages d'une ligne sélectionnée d'une table RDD (sujets 249, 253, 260) : section du mode (fonctionnel), puis
 * « PostgreSQL » et « Gouvernance » pour un champ ; le texte seul pour un séparateur.
 */

const isKey = (target: ModeTarget, part?: string) => isPrimaryKey(fieldOf(target, part)?.field);
const notField = (_page: unknown, target: ModeTarget, part?: string) => !fieldOf(target, part);
/** Pas de champ, ou la clé primaire (ni type, ni optionnel, ni unique : imposés, sujet 260). */
const notPlainField = (_page: unknown, target: ModeTarget, part?: string) =>
  !fieldOf(target, part) || isKey(target, part);
/** Pas de type pour un champ de relation (sujet 265), en plus de la clé primaire. */
const untyped = (page: unknown, target: ModeTarget, part?: string) =>
  notPlainField(page, target, part) || isRelation(fieldOf(target, part)?.field);

/** Écriture d'une propriété du champ sélectionné. */
const writeField =
  (patch: (value: string | undefined) => Parameters<typeof setField>[3]): ModeProperty['write'] =>
  (edit, target, value, part) => {
    const selected = fieldOf(target, part);
    if (selected) setField(edit, selected.shape, selected.index, patch(value));
  };

/** Réglage du panneau d'une option de champ (`FIELD_OPTIONS`) : masqué là où sa règle `on` ne la permet pas. */
const optionProperty = (option: FieldOption): ModeProperty => ({
  ...(option.type === 'flag'
    ? {
        type: 'toggle' as const,
        value: (_page, target, part) => toggleValue(!!fieldOf(target, part)?.field[option.key]),
        write: writeField((value) => ({ [option.key]: isToggled(value) })),
      }
    : {
        type: 'text' as const,
        multiline: option.multiline,
        value: (_page, target, part) => fieldOf(target, part)?.field[option.key],
        write: writeField((value) => ({ [option.key]: value?.trim() || undefined })),
      }),
  part: true,
  key: `rdd.field.${option.key}`,
  label: option.label,
  title: option.title,
  section: option.section,
  hidden: (_page, target, part) => {
    const selected = fieldOf(target, part);
    const table = selected && tableKindOf(selected.shape);
    return !selected || !table || !option.on(table, selected.field);
  },
});

/** Réglages d'un champ classique. */
const CLASSIC_FIELD_PROPERTIES: ModeProperty[] = [
  {
    type: 'text',
    part: true,
    key: 'rdd.field.label',
    label: 'Champ',
    title: 'Nom du champ (double-clic sur la ligne : modification sur place) ; jamais vide ; la clé primaire reste id',
    readOnly: (_page, target, part) => isKey(target, part),
    value: (_page, target, part) => fieldOf(target, part)?.field.label,
    write: writeField((value) => ({ label: value ?? '' })),
    hidden: notField,
  },
  {
    // Séparateur sélectionné (sujet 253) : son texte, vide permis (un simple trait).
    type: 'text',
    part: true,
    key: 'rdd.divider.label',
    label: 'Séparateur',
    title: 'Texte au milieu du séparateur ; vide : un simple trait',
    value: (_page, target, part) => rowOf(target, part)?.row.label,
    write: (edit, target, value, part) => {
      const selected = rowOf(target, part);
      if (selected) fieldParts.setText!(edit, selected.shape, String(selected.index), value ?? '');
    },
    hidden: (_page, target, part) => {
      const selected = rowOf(target, part);
      return !selected || !isDivider(selected.row);
    },
  },
  {
    // Type de donnée, modifiable à tout moment (sujet 256) ; « Aucun » pour un champ ajouté par le « + ».
    type: 'select',
    part: true,
    key: 'rdd.field.type',
    label: 'Type',
    title: 'Type de donnée du champ',
    options: () => [
      { value: '', label: 'Aucun' },
      ...Object.entries(FIELD_TYPES).map(([value, label]) => ({ value, label })),
    ],
    value: (_page, target, part) => fieldOf(target, part)?.field.type,
    write: writeField((value) => ({ type: value ?? '' })),
    hidden: untyped,
  },
  {
    // Clé primaire : son type imposé (« Primary key », « Mot »), en lecture seule (sujet 260).
    type: 'text',
    part: true,
    key: 'rdd.field.keyType',
    label: 'Type',
    title: 'Type imposé de la clé primaire',
    readOnly: true,
    value: (_page, target, part) => {
      const selected = fieldOf(target, part);
      return selected && fieldTypeLabel(selected.field.type);
    },
    hidden: (_page, target, part) => !isKey(target, part),
  },
  ...FIELD_OPTIONS.filter((option) => option.panel !== false).map(optionProperty),
];

/**
 * Réglages de la ligne sélectionnée : ceux d'un champ classique, sauf pour un champ qui n'est que la trace de sa
 * relation (embedded, sujet 268), qui montre le formulaire de sa flèche.
 */
export const FIELD_PROPERTIES: ModeProperty[] = [
  ...onlyWhen(CLASSIC_FIELD_PROPERTIES, (page, target, part) => !edgeOwnedField(page, target, part)),
  ...RELATION_FIELD_PROPERTIES,
];
