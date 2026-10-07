import type { Rect, ShapeModel } from '../../model/types';
import { measureText } from '../../render/textMeasure';
import { spatialValue } from '../../spatial';

/**
 * Données des tables du mode RDD (sujets 179, 180) : attributs `spatial.*`, formes de table, tailles, champs. Le rendu
 * et la fabrique des formes sont dans `shapes/common/table.ts`, les opérations dans `operations.ts`.
 */

/**
 * Champs d'une table : liste JSON d'objets `{kind, label, type, nullable}` (sujet 246). Pas de lecture de l'ancien
 * format (liste de noms) : le mode RDD ne vise ni l'ouverture dans draw.io ni les fichiers d'avant.
 */
export const FIELDS = 'spatial.fields';
/** Table secondaire (`1`) : rendu 20 % plus petit. */
export const SECONDARY = 'spatial.secondary';
/** Icône d'entête masquée (`0`) ; absent = affichée, pour une table qui en a une (sujet 222). */
export const ICON = 'spatial.icon';
/** Échelle d'une table secondaire. */
export const SECONDARY_SCALE = 0.8;

/** Tailles d'une table principale, en pixels de page (× `SECONDARY_SCALE` pour une table secondaire). */
export const TABLE = {
  /** Entête : le nom. */
  header: 26,
  row: 20,
  nameSize: 12,
  fieldSize: 11,
  /** Marge des champs à gauche (et à droite, pour la largeur). */
  padding: 6,
  /** Icône de kind devant un champ (sujet 248) : côté du cadre, air avant le label. */
  fieldIcon: { size: 12, gap: 4 },
  /** Air entre le label d'un champ et son type. */
  typeGap: 6,
  /** Écart du second trait d'un entête à cadre double. */
  doubleGap: 3,
  /** Côté du coin plié d'un document. */
  fold: 10,
  /**
   * Icône d'entête : cadre de dessin (14 × 9), agrandi `zoom` fois à l'affichage (21 × 13,5 px), écart au bord droit
   * de l'entête.
   */
  mark: { width: 14, height: 9, zoom: 1.5, margin: 7, gap: 4 },
  /** Amplitude du bas ondulé d'un embedded ; la table a deux amplitudes de plus en bas. */
  wave: 2,
  /** Largeur minimale (sujet 247) : la table s'élargit au-delà pour son nom ou son plus long champ. */
  minWidth: 120,
} as const;

/** Couleur d'entête par défaut : le style « Gris » des styles de forme (sujet 235), avec son texte. */
export const DEFAULT_HEADER_COLOR = '#f5f5f5';
export const DEFAULT_HEADER_TEXT = '#333333';

/** Icône d'entête : jumelles (vue), liste (énumération), prise électrique (embedded, sujet 223). */
export type HeaderMark = 'binoculars' | 'list' | 'plug';

/**
 * Forme de table, reconnue à sa marque propre (sans mention au-dessus du nom, sujet 218) : nom en italique, clé
 * primaire `id` toujours en tête des champs (sujet 180)…
 */
export interface TableKind {
  italic?: boolean;
  primaryKey?: boolean;
  /** Cadre double autour de l'entête (sujet 215). */
  doubleHeader?: boolean;
  /** Champs en italique : indicatifs, sans contrainte (document JSONB, sujet 181). */
  italicFields?: boolean;
  /** Nom obligatoire : affiché à la place d'un nom vide, qui est signalé (document JSONB, sujet 181). */
  requiredName?: string;
  /** Coin plié en haut à droite (document, sujet 218). */
  folded?: boolean;
  /** Bas ondulé (embedded, sujet 219). */
  wavy?: boolean;
  /** Icône en haut à droite de l'entête (sujets 220, 222). */
  mark?: HeaderMark;
  /** Clés du style draw.io d'une table neuve (ex. `rounded=1;`) : le rendu les suit, draw.io aussi. */
  style?: string;
}

/** Rôle d'un champ (sujet 246) : clé primaire, propriété, clé étrangère, clé étrangère d'un autre domaine. */
export type FieldKind = 'pk' | 'property' | 'fk' | 'external-fk';
export const FIELD_KINDS: readonly FieldKind[] = ['pk', 'property', 'fk', 'external-fk'];

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
}

/** Clé primaire des tables qui en ont une : premier champ, jamais nullable, ni retirée ni déplacée. */
export const PRIMARY_KEY: Field = { kind: 'pk', label: 'id', type: 'integer', nullable: false };

/** Champ lu du fichier ; undefined pour une entrée illisible (sans label, kind inconnu…). */
function readField(item: unknown): Field | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const { kind, label, type, nullable } = item as Record<string, unknown>;
  if (typeof label !== 'string' || !FIELD_KINDS.includes(kind as FieldKind)) return undefined;
  return {
    kind: kind as FieldKind,
    label,
    type: typeof type === 'string' ? type : '',
    // Une clé primaire n'est jamais nullable, quoi qu'en dise le fichier.
    nullable: nullable === true && kind !== 'pk',
  };
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

/** Valeur écrite de `spatial.fields` (clés dans un ordre fixe) ; undefined sans champ. */
export const fieldsValue = (fields: readonly Field[]): string | undefined =>
  fields.length > 0
    ? JSON.stringify(
        fields.map(({ kind, label, type, nullable }) => ({ kind, label, type, nullable: kind !== 'pk' && nullable })),
      )
    : undefined;

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<string, TableKind> = {
  'rdd-model': { italic: true },
  'rdd-entity': { primaryKey: true },
  'rdd-enum': { primaryKey: true, doubleHeader: true, mark: 'list' },
  // Sujet 181 : objet incorporé (bas ondulé, sujet 219), document JSONB (clés indicatives), vue (coins arrondis).
  'rdd-embedded': { wavy: true, mark: 'plug' },
  'rdd-document': { italicFields: true, requiredName: 'Document', folded: true },
  'rdd-view': { style: 'rounded=1;absoluteArcSize=1;arcSize=16;', mark: 'binoculars' },
};

/** Forme de table d'une forme du mode ; undefined pour une autre forme. */
export const tableKindOf = (shape: ShapeModel): TableKind | undefined => TABLE_KINDS[shape.kind];

/** Champs de la table (`spatial.fields`) ; une valeur ou une entrée illisible est ignorée (et signalée). */
export function fieldsOf(shape: ShapeModel): Field[] {
  return (rawFields(shape) ?? []).map(readField).filter((field): field is Field => field !== undefined);
}

/**
 * Champs affichés : ceux du fichier, la clé primaire ramenée en tête (ajoutée si elle manque) pour une table qui en a
 * une.
 */
export function tableFields(shape: ShapeModel): Field[] {
  const fields = fieldsOf(shape);
  if (!tableKindOf(shape)?.primaryKey) return fields;
  const key = fields.find((field) => field.kind === 'pk');
  return [key ?? PRIMARY_KEY, ...fields.filter((field) => field !== key)];
}

/** La clé primaire manque ou n'est pas en tête dans le fichier (fichier modifié à la main) ? */
export const misplacedPrimaryKey = (shape: ShapeModel) =>
  tableKindOf(shape)?.primaryKey === true && fieldsOf(shape)[0]?.kind !== 'pk';

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
  for (const field of fieldsOf(shape)) {
    // Sans type (sujet 256) : permis ; seul un type écrit et inconnu est signalé.
    if (field.type && !(field.type in FIELD_TYPES))
      problems.push(`champ ${field.label} : type « ${field.type} » inconnu`);
  }
  if (raw.some((item) => readField(item)?.kind === 'pk' && (item as { nullable?: unknown }).nullable === true)) {
    problems.push('clé primaire nullable, lue non nullable');
  }
  return problems;
}

/** Nom vide d'une table au nom obligatoire (document JSONB) ? */
export const missingName = (shape: ShapeModel) =>
  tableKindOf(shape)?.requiredName !== undefined && shape.label.trim() === '';

/** Icône d'entête affichée : celle de la forme de table, sauf si la table la masque (`spatial.icon=0`). */
export function shownMark(shape: ShapeModel): HeaderMark | undefined {
  const mark = tableKindOf(shape)?.mark;
  return mark && spatialValue(shape, ICON) !== '0' ? mark : undefined;
}

export const isSecondary = (shape: ShapeModel) => spatialValue(shape, SECONDARY) === '1';

/** Hauteur de l'entête, à l'échelle de la table. */
export function headerHeight(secondary: boolean): number {
  return TABLE.header * (secondary ? SECONDARY_SCALE : 1);
}

/**
 * Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide), plus la place de
 * la vague d'un bas ondulé.
 */
export function tableHeight(kind: TableKind, secondary: boolean, count: number): number {
  const rows = Math.max(1, count) * TABLE.row + (kind.wavy ? 2 * TABLE.wave : 0);
  return headerHeight(secondary) + rows * (secondary ? SECONDARY_SCALE : 1);
}

/**
 * Retrait du nom de chaque côté pour l'icône d'entête (marge, icône agrandie, air avant le titre), à l'échelle 1 : le
 * nom reste centré dans la table.
 */
export function markInset(): number {
  const { width, zoom, margin, gap } = TABLE.mark;
  return margin + width * zoom + gap;
}

/** Type affiché d'un champ : son libellé, ou l'identifiant tel quel s'il est inconnu ; vide sans type. */
export const fieldTypeLabel = (type: string): string =>
  type in FIELD_TYPES ? FIELD_TYPES[type as keyof typeof FIELD_TYPES] : type;

/**
 * Mise en page d'une ligne de champ (sujet 248), en abscisses depuis le bord gauche de la table, à l'échelle 1 : icône
 * de kind, label, puis type (absent sans type) ; `width` : largeur de la ligne, marge de droite comprise.
 */
export function fieldLayout(kind: TableKind, field: Field): { label: number; type?: number; width: number } {
  const label = TABLE.padding + TABLE.fieldIcon.size + TABLE.fieldIcon.gap;
  const end =
    label + measureText(field.label, { size: TABLE.fieldSize, bold: false, italic: kind.italicFields ?? false });
  const typeText = fieldTypeLabel(field.type);
  if (!typeText) return { label, width: end + TABLE.padding };
  const type = end + TABLE.typeGap;
  const width = type + measureText(typeText, { size: TABLE.fieldSize, bold: false, italic: false }) + TABLE.padding;
  return { label, type, width };
}

/** Ce dont dépend la taille d'une table : nom affiché, champs, échelle, icône d'entête. */
export interface TableContent {
  name: string;
  fields: readonly Field[];
  secondary: boolean;
  mark: boolean;
}

/** Contenu actuel d'une table (nom de remplacement d'un document sans nom compris). */
export const tableContent = (shape: ShapeModel): TableContent => ({
  name: missingName(shape) ? tableKindOf(shape)!.requiredName! : shape.label,
  fields: tableFields(shape),
  secondary: isSecondary(shape),
  mark: shownMark(shape) !== undefined,
});

/**
 * Largeur d'une table (sujet 247) : celle de son nom (gras, plus la place de l'icône d'entête de chaque côté) ou de
 * son plus long champ (icône, label et type), marges comprises, au moins `TABLE.minWidth` ; à l'échelle d'une table secondaire. Mesurée à
 * l'échelle 1 puis réduite, comme le reste de la table.
 */
export function tableWidth(kind: TableKind, content: TableContent): number {
  const name = Math.max(
    0,
    ...content.name
      .split('\n')
      .map((line) => measureText(line.trim(), { size: TABLE.nameSize, bold: true, italic: kind.italic ?? false })),
  );
  const fields = content.fields.map((field) => fieldLayout(kind, field).width);
  const header = name + 2 * (TABLE.padding + (content.mark ? markInset() : 0));
  const width = Math.ceil(Math.max(TABLE.minWidth, header, ...fields));
  return width * (content.secondary ? SECONDARY_SCALE : 1);
}

/** Ligne du champ `index` (pixels de page), sous l'entête, sur toute la largeur de la table (sujet 249). */
export function fieldRow(shape: ShapeModel, index: number): Rect {
  const secondary = isSecondary(shape);
  const row = TABLE.row * (secondary ? SECONDARY_SCALE : 1);
  const { x, y, width } = shape.bounds;
  return { x, y: y + headerHeight(secondary) + row * index, width, height: row };
}
