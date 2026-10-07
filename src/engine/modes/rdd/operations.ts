import type { ShapeModel } from '../../model/types';
import type { ModeEdit } from '../types';
import { writeRelationEdge } from './relations/relationKinds';
import type { Field, TableRow } from './fieldModel';
import { FIELDS, fieldsValue, isDivider, isPrimaryKey, isRelation, newFieldLabel, tableFields } from './fieldModel';
import { tableKindOf } from './tableKinds';
import type { TableContent } from './tableLayout';
import {
  SECONDARY,
  TABLE,
  headerHeight,
  isSecondary,
  roundSize,
  secondaryScale,
  tableContent,
  tableHeight,
  tableSize,
  tableWidth,
} from './tableLayout';

/**
 * Opérations du mode RDD sur une table (sujets 179, 180) : champs, couleur d'entête, table secondaire. Chacune est une
 * opération de mode (une étape d'annulation) ; la forme garde la taille de son contenu (sujet 247).
 */

/**
 * Taille de la table recalculée de son contenu (sujet 247), depuis son coin haut-gauche, la largeur étendue à droite
 * jusqu'au pas de grille (sujet 263), la hauteur au plus juste (sujet 264) ; `changes` : ce que l'opération en cours
 * vient d'écrire (la page de `edit` ne le montre pas encore).
 */
export function fitTable(edit: ModeEdit, shape: ShapeModel, changes: Partial<TableContent> = {}): void {
  const kind = tableKindOf(shape);
  if (!kind) return;
  const content = { ...tableContent(shape), ...changes };
  edit.setShapeBounds(shape.id, {
    ...shape.bounds,
    width: tableSize(tableWidth(kind, content), edit.gridSize),
    height: roundSize(tableHeight(kind, content.secondary, content.fields.length)),
  });
}

/** Lignes écrites dans la table, et sa taille qui suit. */
export function writeRows(edit: ModeEdit, shape: ShapeModel, rows: readonly TableRow[]): void {
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(rows));
  fitTable(edit, shape, { fields: rows });
}

/**
 * Champ `index` de la table modifié (sujet 249) : label, kind, nullable, type (sujet 256, vide = aucun) ; la taille
 * suit. Un label vide est refusé ; la clé primaire garde son kind et n'est jamais nullable, et aucun champ ne devient
 * clé primaire. Un champ de relation garde son kind et reste sans type (sujet 265). Un séparateur ne prend que le
 * label, vide permis (sujet 253).
 */
export function setField(edit: ModeEdit, shape: ShapeModel, index: number, patch: Partial<Field>): void {
  const rows = tableFields(shape);
  const row = rows[index];
  const label = patch.label?.trim();
  // Un séparateur peut être vide (sujet 253) ; un champ refuse un label vide.
  if (!tableKindOf(shape) || !row || (label === '' && !isDivider(row))) return;
  // Clé primaire : label `id` et type imposés (sujet 260).
  if (isPrimaryKey(row) && label !== undefined) return;
  let next: TableRow;
  if (isDivider(row)) next = { ...row, ...(label !== undefined && { label }) };
  else {
    const key = isPrimaryKey(row);
    const relation = isRelation(row);
    const kind = patch.kind;
    next = {
      ...row,
      ...(label !== undefined && { label }),
      ...(kind !== undefined && !key && !relation && !isPrimaryKey({ ...row, kind }) && { kind }),
      ...(patch.nullable !== undefined && !key && { nullable: patch.nullable }),
      ...(patch.type !== undefined && !key && !relation && { type: patch.type }),
      ...(patch.unique !== undefined && !key && { unique: patch.unique || undefined }),
      // Propriétés facultatives (sujet 260) : vide ou faux les retire.
      ...('comment' in patch && { comment: patch.comment || undefined }),
      ...('pgName' in patch && { pgName: patch.pgName || undefined }),
      ...('pgType' in patch && { pgType: patch.pgType || undefined }),
      ...('gdpr' in patch && { gdpr: patch.gdpr || undefined }),
      // Préfixe d'un champ de relation embedded (sujet 268).
      ...('prefix' in patch && relation && { prefix: patch.prefix || undefined }),
      ...('personal' in patch && { personal: patch.personal || undefined }),
    };
  }
  writeRows(
    edit,
    shape,
    rows.map((current, i) => (i === index ? next : current)),
  );
  // Champ de relation : les bouts de sa flèche suivent le champ (cardinalités d'après « Optionnel », sujet 265).
  if (isRelation(next)) writeRelationEdge(edit, next);
}

/** Ajoute une ligne après la ligne `after` (sinon en fin de liste ; jamais avant la clé primaire) ; renvoie son rang. */
function addRow(edit: ModeEdit, shape: ShapeModel, make: (rows: TableRow[]) => TableRow, after?: number) {
  if (!tableKindOf(shape)) return undefined;
  const rows = tableFields(shape);
  const keyed = isPrimaryKey(rows[0]) ? 1 : 0;
  const index = after === undefined ? rows.length : Math.max(keyed, Math.min(after + 1, rows.length));
  writeRows(edit, shape, [...rows.slice(0, index), make(rows), ...rows.slice(index)]);
  return index;
}

/**
 * Ajoute un champ (sujet 250) : propriété optionnelle (sujet 261) du type `type` (vide = sans type, sujet 256), nommée `FieldN`,
 * après la ligne `after` (sinon en fin de liste ; jamais avant la clé primaire) ; la taille suit. Renvoie son rang.
 */
export function addField(edit: ModeEdit, shape: ShapeModel, type: string, after?: number): number | undefined {
  return addRow(edit, shape, (rows) => ({ kind: 'property', label: newFieldLabel(rows), type, nullable: true }), after);
}

/** Ajoute un séparateur sans label après la ligne `after` (sujet 253), comme `addField` ; renvoie son rang. */
export function addDivider(edit: ModeEdit, shape: ShapeModel, after?: number): number | undefined {
  return addRow(edit, shape, () => ({ divider: true, label: '' }), after);
}

/**
 * Retire la ligne `index` (champ, sujet 251, ou séparateur) ; jamais la clé primaire, ni un champ de relation (il part
 * avec sa flèche, sujet 265). La taille suit.
 */
export function removeField(edit: ModeEdit, shape: ShapeModel, index: number): void {
  const rows = tableFields(shape);
  if (!tableKindOf(shape) || !rows[index] || isPrimaryKey(rows[index]) || isRelation(rows[index])) return;
  writeRows(
    edit,
    shape,
    rows.filter((_, i) => i !== index),
  );
}

/**
 * Ordre des lignes avec la ligne `from` à la place `slot` (sujet 252 ; place = rang de la ligne devant laquelle elle
 * va, ou le nombre de lignes pour la fin) et son nouveau rang ; jamais la clé primaire, et rien ne passe devant elle.
 */
export function movedFields(
  rows: readonly TableRow[],
  from: number,
  slot: number,
): { fields: TableRow[]; index: number } | undefined {
  const row = rows[from];
  const keyed = isPrimaryKey(rows[0]) ? 1 : 0;
  if (!row || isPrimaryKey(row) || slot < keyed || slot > rows.length) return undefined;
  const to = slot > from ? slot - 1 : slot;
  const rest = rows.filter((_, i) => i !== from);
  return { fields: [...rest.slice(0, to), row, ...rest.slice(to)], index: to };
}

/** Déplace la ligne `from` à la place `slot` (`movedFields`) ; renvoie son nouveau rang. */
export function moveField(edit: ModeEdit, shape: ShapeModel, from: number, slot: number): number | undefined {
  const moved = tableKindOf(shape) ? movedFields(tableFields(shape), from, slot) : undefined;
  if (!moved) return undefined;
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(moved.fields));
  return moved.index;
}

/**
 * Table secondaire : la forme prend la taille de son contenu à la nouvelle échelle (× 0,8), depuis son coin
 * haut-gauche ; entête et taille du nom suivent dans le style, pour draw.io.
 */
export function setSecondary(edit: ModeEdit, shape: ShapeModel, secondary: boolean): void {
  const kind = tableKindOf(shape);
  if (!kind || isSecondary(shape) === secondary) return;
  edit.setElementAttribute(shape.id, SECONDARY, secondary ? '1' : undefined);
  fitTable(edit, shape, { secondary });
  edit.setElementStyle(shape.id, 'startSize', String(roundSize(headerHeight(secondary))));
  edit.setElementStyle(shape.id, 'fontSize', String(roundSize(TABLE.nameSize * secondaryScale(secondary))));
}
