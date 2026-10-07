import { jsonListValue, readJsonList, spatialValue } from '../../../../core/plugins';
import type { ShapeModel } from '../../../../core/plugins';
import type { TableKind } from './tableKinds';
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

/** Options d'un champ à cocher, et en texte libre. */
export type FieldFlag = 'nullable' | 'unique' | 'gdpr' | 'personal';
export type FieldText = 'comment' | 'pgName' | 'pgType' | 'prefix';

/**
 * Option d'un champ (sujets 260, 261, 268) : case à cocher ou texte (vide : retiré), son réglage au panneau d'un champ
 * (`label`, `title`, `section`, `multiline`) et `on`, la règle qui la permet : hors d'elle, elle n'est ni lue, ni écrite
 * par `setField`, ni montrée au panneau.
 */
export type FieldOption = (
  { key: FieldFlag; type: 'flag'; multiline?: never } | { key: FieldText; type: 'text'; multiline?: boolean }
) & {
  label: string;
  title: string;
  section?: string;
  /** Réglée ailleurs qu'au panneau d'un champ (préfixe : formulaire de sa relation, sujet 268). */
  panel?: false;
  on(table: TableKind, field: Field): boolean;
};

const POSTGRESQL = 'PostgreSQL';
const GOVERNANCE = 'Gouvernance';

/** Options d'un champ, dans l'ordre du panneau. */
export const FIELD_OPTIONS: readonly FieldOption[] = [
  // « Optionnel » (ancien « Nullable ») et « Unique » : pas sur la clé primaire (unique par nature, sujet 260).
  {
    key: 'nullable',
    type: 'flag',
    label: 'Optionnel',
    title: 'Le champ peut être vide (NULL)',
    on: (_table, field) => !isPrimaryKey(field),
  },
  {
    key: 'unique',
    type: 'flag',
    label: 'Unique',
    title: 'Valeurs uniques dans la table (contrainte d’unicité)',
    on: (table, field) => !isPrimaryKey(field) && !!table.rules.uniqueFields,
  },
  // Commentaire : zone de texte sous son libellé, sur toute la largeur (⌘ + Entrée ou sortie du champ pour valider).
  {
    key: 'comment',
    type: 'text',
    label: 'Commentaire',
    title: 'Commentaire du champ (⌘ + Entrée pour valider)',
    multiline: true,
    on: () => true,
  },
  {
    key: 'pgName',
    type: 'text',
    label: 'Nom du champ',
    title: 'Nom de la colonne PostgreSQL',
    section: POSTGRESQL,
    on: () => true,
  },
  {
    key: 'pgType',
    type: 'text',
    label: 'Type',
    title: 'Type PostgreSQL de la colonne (texte libre, ex. varchar(255), uuid)',
    section: POSTGRESQL,
    on: () => true,
  },
  { key: 'gdpr', type: 'flag', label: 'GDPR', title: 'Champ soumis au GDPR', section: GOVERNANCE, on: () => true },
  {
    key: 'personal',
    type: 'flag',
    label: 'Donnée personnelle',
    title: 'Le champ contient une donnée personnelle',
    section: GOVERNANCE,
    on: () => true,
  },
  // Préfixe d'un champ de relation (sujet 268), en gris à la place du type.
  {
    key: 'prefix',
    type: 'text',
    label: 'Préfixe',
    title: 'Préfixe des champs de l’embedded dans la table d’arrivée (prefix)',
    panel: false,
    on: (_table, field) => isRelation(field),
  },
];

/** Option `key` d'un champ. */
const optionOf = (key: string) => FIELD_OPTIONS.find((option) => option.key === key);

/**
 * Clés facultatives écrites dans `spatial.fields`, seulement si elles sont renseignées, dans cet ordre (celui des
 * fichiers déjà écrits) : les options, sauf « Optionnel » toujours écrit avec le champ, et `edge`, le lien d'un champ
 * de relation à sa flèche (sujet 265).
 */
const STORED_KEYS = ['unique', 'gdpr', 'personal', 'comment', 'pgName', 'pgType', 'edge', 'prefix'] as const;
const isFlagKey = (key: (typeof STORED_KEYS)[number]) => optionOf(key)?.type === 'flag';

/** Valeur d'une option écrite par `setField` : vide ou faux la retire ; « Optionnel » reste un booléen. */
export function optionValue(option: FieldOption, value: unknown): boolean | string | undefined {
  if (option.key === 'nullable') return !!value;
  if (option.type === 'flag') return value ? true : undefined;
  return typeof value === 'string' && value ? value : undefined;
}

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
  for (const key of STORED_KEYS) {
    const value = record[key];
    if (isFlagKey(key) ? value === true : typeof value === 'string' && value) Object.assign(field, { [key]: value });
  }
  return field;
}

/** Entrées brutes de `spatial.fields` ; undefined si la valeur n'est pas une liste JSON. */
function rawFields(shape: ShapeModel): unknown[] | undefined {
  return readJsonList(spatialValue(shape, FIELDS));
}

/** Valeur écrite de `spatial.fields` (clés dans un ordre fixe) ; undefined sans ligne. */
export const fieldsValue = (rows: readonly TableRow[]): string | undefined =>
  jsonListValue(
    rows.map((row) =>
      isDivider(row)
        ? { divider: true, label: row.label }
        : {
            kind: row.kind,
            label: row.label,
            type: row.type,
            nullable: !isPrimaryKey(row) && row.nullable,
            ...Object.fromEntries(STORED_KEYS.filter((key) => row[key]).map((key) => [key, row[key]])),
          },
    ),
  );

/**
 * Lignes de la table (`spatial.fields`) : champs et séparateurs ; une valeur ou une entrée illisible est ignorée (et
 * signalée).
 */
export function fieldsOf(shape: ShapeModel): TableRow[] {
  return (rawFields(shape) ?? []).map(readField).filter((row): row is TableRow => row !== undefined);
}

/** Champ sans les options que la table ne permet pas (`on`, ex. « Unique » sur une vue, fichier modifié). */
function allowedOptions(table: TableKind, field: Field): Field {
  const refused = FIELD_OPTIONS.filter(
    (option) => option.key !== 'nullable' && field[option.key] !== undefined && !option.on(table, field),
  );
  if (refused.length === 0) return field;
  const next = { ...field };
  for (const option of refused) delete next[option.key];
  return next;
}

/**
 * Champs affichés : ceux du fichier, sans les options que la table ne permet pas, la clé primaire ramenée en tête
 * (ajoutée si elle manque) pour une table qui en a une. Toute écriture de la table repart d'eux : une option refusée
 * disparaît du fichier.
 */
export function tableFields(shape: ShapeModel): TableRow[] {
  const table = tableKindOf(shape);
  const rows = fieldsOf(shape).map((row) => (table && !isDivider(row) ? allowedOptions(table, row) : row));
  const type = table?.rules.primaryKey;
  if (!type) return rows;
  const key = rows.find(isPrimaryKey) as Field | undefined;
  // `id` et le type imposé, quoi qu'en dise le fichier (sujet 260).
  return [primaryKeyField(type, key), ...rows.filter((row) => row !== key)];
}

/** La clé primaire manque ou n'est pas en tête dans le fichier (fichier modifié à la main) ? */
export const misplacedPrimaryKey = (shape: ShapeModel) =>
  tableKindOf(shape)?.rules.primaryKey !== undefined && !isPrimaryKey(fieldsOf(shape)[0]);

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
