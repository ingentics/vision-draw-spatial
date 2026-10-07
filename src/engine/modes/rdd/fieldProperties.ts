import type { PageModel, ShapeModel } from '../../model/types';
import type { ModeProperty, ModeTarget } from '../types';
import { fieldIndex, fieldParts } from './fieldParts';
import { setField } from './operations';
import { RELATION_FIELD_PROPERTIES, relationOnlyField } from './relations';
import type { Field, TableRow } from './tables';
import { FIELD_TYPES, fieldTypeLabel, isDivider, isRelation, tableFields, tableKindOf } from './tables';

/**
 * Réglages d'une ligne sélectionnée d'une table RDD (sujets 249, 253, 260) : section du mode (fonctionnel), puis
 * « PostgreSQL » et « Gouvernance » pour un champ ; le texte seul pour un séparateur.
 */

/** Table du mode sélectionnée ; undefined pour une autre cible. */
export const tableOf = (target: ModeTarget): ShapeModel | undefined =>
  'kind' in target && tableKindOf(target) ? target : undefined;

/** Ligne sélectionnée d'une table (champ ou séparateur) : la table, le rang et la ligne. */
export function rowOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; row: TableRow } | undefined {
  const shape = tableOf(target);
  const index = shape && fieldIndex(shape, part);
  return shape && index !== undefined ? { shape, index, row: tableFields(shape)[index]! } : undefined;
}

/** Champ sélectionné d'une table (pas un séparateur). */
function fieldOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; field: Field } | undefined {
  const selected = rowOf(target, part);
  return selected && !isDivider(selected.row) ? { ...selected, field: selected.row } : undefined;
}

const isKey = (target: ModeTarget, part?: string) => fieldOf(target, part)?.field.kind === 'pk';
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

/** Case à cocher d'un champ (`unique`, `gdpr`, `personal`). */
function flag(
  key: 'unique' | 'gdpr' | 'personal',
  label: string,
  title: string,
  section?: string,
  hidden: ModeProperty['hidden'] = notField,
): ModeProperty {
  return {
    type: 'toggle',
    part: true,
    key: `rdd.field.${key}`,
    label,
    title,
    section,
    value: (_page, target, part) => (fieldOf(target, part)?.field[key] ? '1' : undefined),
    write: writeField((value) => ({ [key]: value === '1' })),
    hidden,
  };
}

/** Texte d'un champ (`comment`, `pgName`, `pgType`) ; vide le retire ; `multiline` : zone de texte sous le libellé. */
function text(
  key: 'comment' | 'pgName' | 'pgType',
  label: string,
  title: string,
  section?: string,
  multiline?: boolean,
): ModeProperty {
  return {
    type: 'text',
    multiline,
    part: true,
    key: `rdd.field.${key}`,
    label,
    title,
    section,
    value: (_page, target, part) => fieldOf(target, part)?.field[key],
    write: writeField((value) => ({ [key]: value?.trim() || undefined })),
    hidden: notField,
  };
}

const POSTGRESQL = 'PostgreSQL';
const GOVERNANCE = 'Gouvernance';

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
  // « Optionnel » (ancien « Nullable ») et « Unique » : pas sur la clé primaire.
  {
    type: 'toggle',
    part: true,
    key: 'rdd.field.nullable',
    label: 'Optionnel',
    title: 'Le champ peut être vide (NULL)',
    value: (_page, target, part) => (fieldOf(target, part)?.field.nullable ? '1' : undefined),
    write: writeField((value) => ({ nullable: value === '1' })),
    hidden: notPlainField,
  },
  flag('unique', 'Unique', 'Valeurs uniques dans la table (contrainte d’unicité)', undefined, (page, target, part) => {
    const shape = tableOf(target);
    return notPlainField(page, target, part) || !shape || !tableKindOf(shape)?.uniqueFields;
  }),
  // Commentaire : zone de texte sous son libellé, sur toute la largeur (⌘ + Entrée ou sortie du champ pour valider).
  text('comment', 'Commentaire', 'Commentaire du champ (⌘ + Entrée pour valider)', undefined, true),
  text('pgName', 'Nom du champ', 'Nom de la colonne PostgreSQL', POSTGRESQL),
  text('pgType', 'Type', 'Type PostgreSQL de la colonne (texte libre, ex. varchar(255), uuid)', POSTGRESQL),
  flag('gdpr', 'GDPR', 'Champ soumis au GDPR', GOVERNANCE),
  flag('personal', 'Donnée personnelle', 'Le champ contient une donnée personnelle', GOVERNANCE),
];

/**
 * Réglages de la ligne sélectionnée : ceux d'un champ classique, sauf pour un champ qui n'est que la trace de sa
 * relation (embedded, sujet 268), qui montre le formulaire de sa flèche.
 */
export const FIELD_PROPERTIES: ModeProperty[] = [
  ...CLASSIC_FIELD_PROPERTIES.map((property) => ({
    ...property,
    hidden: (page: PageModel, target: ModeTarget, part?: string) =>
      relationOnlyField(page, target, part) || !!property.hidden?.(page, target, part),
  })),
  ...RELATION_FIELD_PROPERTIES,
];
