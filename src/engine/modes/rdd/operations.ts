import type { ShapeModel } from '../../model/types';
import { readableOn } from '../../render/styleColors';
import type { ModeEdit } from '../types';
import type { Field, TableContent, TableRow } from './tables';
import {
  FIELDS,
  ICON,
  SECONDARY,
  SECONDARY_SCALE,
  TABLE,
  headerHeight,
  isDivider,
  isPrimaryKey,
  isSecondary,
  fieldsValue,
  tableContent,
  tableFields,
  tableHeight,
  tableKindOf,
  tableWidth,
} from './tables';

/**
 * Opérations du mode RDD sur une table (sujets 179, 180) : champs, couleur d'entête, table secondaire. Chacune est une
 * opération de mode (une étape d'annulation) ; la forme garde la taille de son contenu (sujet 247).
 */

/** Arrondi des tailles écrites (échelle 0,8 : pas de traîne de flottants). */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Taille de la table recalculée de son contenu (sujet 247), depuis son coin haut-gauche ; `changes` : ce que
 * l'opération en cours vient d'écrire (la page de `edit` ne le montre pas encore).
 */
export function fitTable(edit: ModeEdit, shape: ShapeModel, changes: Partial<TableContent> = {}): void {
  const kind = tableKindOf(shape);
  if (!kind) return;
  const content = { ...tableContent(shape), ...changes };
  edit.setShapeBounds(shape.id, {
    ...shape.bounds,
    width: round(tableWidth(kind, content)),
    height: round(tableHeight(kind, content.secondary, content.fields.length)),
  });
}

/** Lignes écrites dans la table, et sa taille qui suit. */
function writeRows(edit: ModeEdit, shape: ShapeModel, rows: readonly TableRow[]): void {
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(rows));
  fitTable(edit, shape, { fields: rows });
}

/**
 * Champ `index` de la table modifié (sujet 249) : label, kind, nullable, type (sujet 256, vide = aucun) ; la taille
 * suit. Un label vide est refusé ; la clé primaire garde son kind et n'est jamais nullable, et aucun champ ne devient
 * clé primaire. Un séparateur ne prend que le label, vide permis (sujet 253).
 */
export function setField(
  edit: ModeEdit,
  shape: ShapeModel,
  index: number,
  patch: Partial<Pick<Field, 'label' | 'kind' | 'nullable' | 'type'>>,
): void {
  const rows = tableFields(shape);
  const row = rows[index];
  const label = patch.label?.trim();
  // Un séparateur peut être vide (sujet 253) ; un champ refuse un label vide.
  if (!tableKindOf(shape) || !row || (label === '' && !isDivider(row))) return;
  let next: TableRow;
  if (isDivider(row)) next = { ...row, ...(label !== undefined && { label }) };
  else {
    const key = row.kind === 'pk';
    next = {
      ...row,
      ...(label !== undefined && { label }),
      ...(patch.kind !== undefined && !key && patch.kind !== 'pk' && { kind: patch.kind }),
      ...(patch.nullable !== undefined && !key && { nullable: patch.nullable }),
      ...(patch.type !== undefined && { type: patch.type }),
    };
  }
  writeRows(
    edit,
    shape,
    rows.map((current, i) => (i === index ? next : current)),
  );
}

/** Label d'un champ ajouté : `Field1`, `Field2`… (premier numéro libre dans la table). */
export function newFieldLabel(rows: readonly TableRow[]): string {
  const used = new Set(rows.map((row) => row.label));
  let number = 1;
  while (used.has(`Field${number}`)) number += 1;
  return `Field${number}`;
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
 * Ajoute un champ (sujet 250) : propriété non nullable du type `type` (vide = sans type, sujet 256), nommée `FieldN`,
 * après la ligne `after` (sinon en fin de liste ; jamais avant la clé primaire) ; la taille suit. Renvoie son rang.
 */
export function addField(edit: ModeEdit, shape: ShapeModel, type: string, after?: number): number | undefined {
  return addRow(
    edit,
    shape,
    (rows) => ({ kind: 'property', label: newFieldLabel(rows), type, nullable: false }),
    after,
  );
}

/** Ajoute un séparateur sans label après la ligne `after` (sujet 253), comme `addField` ; renvoie son rang. */
export function addDivider(edit: ModeEdit, shape: ShapeModel, after?: number): number | undefined {
  return addRow(edit, shape, () => ({ divider: true, label: '' }), after);
}

/** Retire la ligne `index` (champ, sujet 251, ou séparateur) ; jamais la clé primaire. La taille suit. */
export function removeField(edit: ModeEdit, shape: ShapeModel, index: number): void {
  const rows = tableFields(shape);
  if (!tableKindOf(shape) || !rows[index] || isPrimaryKey(rows[index])) return;
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

/** Couleur de l'entête (`fillColor`) ; le texte du fichier suit le contraste pour draw.io (`fontColor`). */
export function setHeaderColor(edit: ModeEdit, shape: ShapeModel, color: string | undefined): void {
  if (!tableKindOf(shape) || !color) return;
  edit.setElementStyle(shape.id, 'fillColor', color);
  edit.setElementStyle(shape.id, 'fontColor', readableOn(color));
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
  edit.setElementStyle(shape.id, 'startSize', String(round(headerHeight(secondary))));
  edit.setElementStyle(shape.id, 'fontSize', String(round(TABLE.nameSize * (secondary ? SECONDARY_SCALE : 1))));
}

/** Icône d'entête affichée ou masquée (`spatial.icon=0`, sujet 222) : la place du nom change, la largeur suit. */
export function setIcon(edit: ModeEdit, shape: ShapeModel, shown: boolean): void {
  if (!tableKindOf(shape)?.mark) return;
  edit.setElementAttribute(shape.id, ICON, shown ? undefined : '0');
  fitTable(edit, shape, { mark: shown });
}
