import type { ShapeModel } from '../../model/types';
import { spatialValue } from '../../spatial';
import { tableKindOf } from './tableKinds';

/**
 * Champs d'une table du mode RDD (sujets 246, 253, 260) : modèle d'un champ et d'un séparateur, lecture et écriture de
 * `spatial.fields`, clé primaire.
 */

/**
 * Champs d'une table : liste JSON d'objets `{kind, label, type, nullable}` (sujet 246). Pas de lecture de l'ancien
 * format (liste de noms) : le mode RDD ne vise ni l'ouverture dans draw.io ni les fichiers d'avant.
 */
export const FIELDS = 'spatial.fields';

/**
 * Rôle d'un champ (sujet 246) : clé primaire, propriété, clé étrangère, clé étrangère d'un autre domaine, embedded
 * incorporé (champ d'une relation embedded, sujet 268).
 */
export const FIELD_KINDS = ['pk', 'property', 'fk', 'external-fk', 'embed'] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/** Types imposés de la clé primaire (sujet 260), hors de la liste des autres champs. */
export const KEY_TYPES = { 'primary-key': 'Primary key', word: 'Mot' } as const satisfies Record<string, string>;
export type KeyType = keyof typeof KEY_TYPES;

/** Types de donnée d'un champ : identifiant écrit dans le fichier, libellé affiché. */
export const FIELD_TYPES = {
  integer: 'Nombre entier',
  decimal: 'Nombre réel',
  string: 'Phrase',
  text: 'Texte',
  boolean: 'Booléen',
  dynamic: 'Dynamique',
  money: 'Money',
} as const satisfies Record<string, string>;

/**
 * Champ d'une table ; `type` vide : pas encore de type (champ ajouté par le « + », sujet 256) ; inconnu de
 * `FIELD_TYPES` (fichier modifié) : signalé.
 */
export interface Field {
  kind: FieldKind;
  label: string;
  type: string;
  nullable: boolean;
  /** Valeurs uniques (sujet 260 ; entité, énumération, embedded ; jamais la clé primaire). */
  unique?: boolean;
  /** Commentaire du champ (sujet 260). */
  comment?: string;
  /** PostgreSQL (sujet 260) : nom de la colonne et son type (texte libre, ex. `varchar(255)`). */
  pgName?: string;
  pgType?: string;
  /** Gouvernance (sujet 260) : soumis au GDPR, donnée personnelle. */
  gdpr?: boolean;
  personal?: boolean;
  /** Champ de relation (sujet 265) : id de la flèche qui l'a créé ; il la suit (retiré, déplacé avec elle). */
  edge?: string;
  /** Préfixe d'un champ de relation embedded (sujet 268), réglé depuis la flèche, en gris à la place du type. */
  prefix?: string;
}

/** Propriétés facultatives d'un champ : écrites seulement si elles sont renseignées (sujets 260, 265, 268). */
const OPTIONAL_FLAGS = ['unique', 'gdpr', 'personal'] as const;
const OPTIONAL_TEXTS = ['comment', 'pgName', 'pgType', 'edge', 'prefix'] as const;

/** Séparateur entre les champs (sujet 253) : un trait, son label éventuel au milieu. */
export interface Divider {
  divider: true;
  label: string;
}

/** Ligne de la zone des champs : un champ ou un séparateur. */
export type TableRow = Field | Divider;

export const isDivider = (row: TableRow): row is Divider => 'divider' in row;

/** La ligne est-elle la clé primaire ? */
export const isPrimaryKey = (row: TableRow | undefined): boolean => !!row && !isDivider(row) && row.kind === 'pk';

/** La ligne est-elle un champ de relation, lié à sa flèche (sujet 265) ? */
export const isRelation = (row: TableRow | undefined): row is Field & { edge: string } =>
  !!row && !isDivider(row) && row.edge !== undefined;

/**
 * Label d'un champ ajouté : `Field1`, `Field2`… (premier numéro libre dans la table) ; `prefix` : `relation` pour un
 * champ de relation (sujet 265).
 */
export function newFieldLabel(rows: readonly TableRow[], prefix = 'Field'): string {
  const used = new Set(rows.map((row) => row.label));
  let number = 1;
  while (used.has(`${prefix}${number}`)) number += 1;
  return `${prefix}${number}`;
}

/** Label de la clé primaire : toujours `id` (sujet 260). */
export const PRIMARY_KEY = 'id';

/**
 * Clé primaire d'une table qui en a une : premier champ, `id`, du type imposé par la table (sujet 260), jamais nullable
 * ni unique (elle l'est par nature), ni retirée ni déplacée ; ses autres propriétés (commentaire, PostgreSQL,
 * gouvernance) sont gardées.
 */
export const primaryKeyField = (type: KeyType, from?: Field): Field => ({
  ...from,
  kind: 'pk',
  label: PRIMARY_KEY,
  type,
  nullable: false,
  unique: undefined,
});

/** Ligne lue du fichier ; undefined pour une entrée illisible (sans label, kind inconnu…). */
function readField(item: unknown): TableRow | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const { kind, label, type, nullable, divider } = item as Record<string, unknown>;
  if (divider === true) return { divider: true, label: typeof label === 'string' ? label : '' };
  if (typeof label !== 'string' || !FIELD_KINDS.includes(kind as FieldKind)) return undefined;
  const field: Field = { kind: kind as FieldKind, label, type: typeof type === 'string' ? type : '', nullable: false };
  // Une clé primaire n'est jamais nullable, quoi qu'en dise le fichier.
  field.nullable = nullable === true && !isPrimaryKey(field);
  const record = item as Record<string, unknown>;
  for (const key of OPTIONAL_FLAGS) if (record[key] === true) field[key] = true;
  for (const key of OPTIONAL_TEXTS) if (typeof record[key] === 'string' && record[key]) field[key] = record[key];
  return field;
}

/** Entrées brutes de `spatial.fields` ; undefined si la valeur n'est pas une liste JSON. */
function rawFields(shape: ShapeModel): unknown[] | undefined {
  try {
    const value: unknown = JSON.parse(spatialValue(shape, FIELDS) ?? '[]');
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Valeur écrite de `spatial.fields` (clés dans un ordre fixe) ; undefined sans ligne. */
export const fieldsValue = (rows: readonly TableRow[]): string | undefined =>
  rows.length > 0
    ? JSON.stringify(
        rows.map((row) =>
          isDivider(row)
            ? { divider: true, label: row.label }
            : {
                kind: row.kind,
                label: row.label,
                type: row.type,
                nullable: !isPrimaryKey(row) && row.nullable,
                ...Object.fromEntries(OPTIONAL_FLAGS.filter((key) => row[key]).map((key) => [key, true])),
                ...Object.fromEntries(OPTIONAL_TEXTS.filter((key) => row[key]).map((key) => [key, row[key]])),
              },
        ),
      )
    : undefined;

/**
 * Lignes de la table (`spatial.fields`) : champs et séparateurs ; une valeur ou une entrée illisible est ignorée (et
 * signalée).
 */
export function fieldsOf(shape: ShapeModel): TableRow[] {
  return (rawFields(shape) ?? []).map(readField).filter((row): row is TableRow => row !== undefined);
}

/**
 * Champs affichés : ceux du fichier, la clé primaire ramenée en tête (ajoutée si elle manque) pour une table qui en a
 * une.
 */
export function tableFields(shape: ShapeModel): TableRow[] {
  const rows = fieldsOf(shape);
  const type = tableKindOf(shape)?.primaryKey;
  if (!type) return rows;
  const key = rows.find(isPrimaryKey) as Field | undefined;
  // `id` et le type imposé, quoi qu'en dise le fichier (sujet 260).
  return [primaryKeyField(type, key), ...rows.filter((row) => row !== key)];
}

/** La clé primaire manque ou n'est pas en tête dans le fichier (fichier modifié à la main) ? */
export const misplacedPrimaryKey = (shape: ShapeModel) =>
  tableKindOf(shape)?.primaryKey !== undefined && !isPrimaryKey(fieldsOf(shape)[0]);

/**
 * Défauts de `spatial.fields` d'une table (fichier modifié à la main) : valeur ou entrées illisibles, type inconnu,
 * clé primaire nullable.
 */
export function fieldProblems(shape: ShapeModel): string[] {
  if (!tableKindOf(shape)) return [];
  const raw = rawFields(shape);
  if (!raw) return ['champs illisibles, ignorés'];
  const problems: string[] = [];
  const unreadable = raw.filter((item) => !readField(item)).length;
  if (unreadable > 0) problems.push(`${unreadable} champ(s) illisible(s), ignoré(s)`);
  for (const row of fieldsOf(shape)) {
    // Sans type (sujet 256) : permis ; seul un type écrit et inconnu est signalé.
    if (!isDivider(row) && !isPrimaryKey(row) && row.type && !(row.type in FIELD_TYPES))
      problems.push(`champ ${row.label} : type « ${row.type} » inconnu`);
  }
  if (raw.some((item) => isPrimaryKey(readField(item)) && (item as { nullable?: unknown }).nullable === true)) {
    problems.push('clé primaire nullable, lue non nullable');
  }
  return problems;
}

/** Type affiché d'un champ : son libellé, ou l'identifiant tel quel s'il est inconnu ; vide sans type. */
export const fieldTypeLabel = (type: string): string =>
  type in FIELD_TYPES
    ? FIELD_TYPES[type as keyof typeof FIELD_TYPES]
    : type in KEY_TYPES
      ? KEY_TYPES[type as KeyType]
      : type;

/** Texte gris d'une ligne de champ : son type, sinon le préfixe d'un champ de relation embedded (sujet 268). */
export const fieldNote = (field: Field): string => fieldTypeLabel(field.type) || (field.prefix ?? '');
