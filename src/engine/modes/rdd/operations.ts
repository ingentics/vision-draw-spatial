import type { ShapeModel } from '../../model/types';
import { readableOn } from '../../render/styleColors';
import type { ModeEdit } from '../types';
import type { Field, TableContent } from './tables';
import {
  FIELDS,
  ICON,
  SECONDARY,
  SECONDARY_SCALE,
  TABLE,
  headerHeight,
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

/**
 * Champ `index` de la table modifié (sujet 249) : label, kind, nullable ; la taille suit. Un label vide est refusé ;
 * la clé primaire garde son kind et n'est jamais nullable, et aucun champ ne devient clé primaire.
 */
export function setField(
  edit: ModeEdit,
  shape: ShapeModel,
  index: number,
  patch: Partial<Pick<Field, 'label' | 'kind' | 'nullable'>>,
): void {
  const fields = tableFields(shape);
  const field = fields[index];
  const label = patch.label?.trim();
  if (!tableKindOf(shape) || !field || label === '') return;
  const key = field.kind === 'pk';
  const next: Field = {
    ...field,
    ...(label !== undefined && { label }),
    ...(patch.kind !== undefined && !key && patch.kind !== 'pk' && { kind: patch.kind }),
    ...(patch.nullable !== undefined && !key && { nullable: patch.nullable }),
  };
  const written = fields.map((current, i) => (i === index ? next : current));
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
}

/** Label d'un champ ajouté : `Field1`, `Field2`… (premier numéro libre dans la table). */
export function newFieldLabel(fields: readonly Field[]): string {
  const used = new Set(fields.map((field) => field.label));
  let number = 1;
  while (used.has(`Field${number}`)) number += 1;
  return `Field${number}`;
}

/**
 * Ajoute un champ (sujet 250) : propriété non nullable du type `type`, nommée `FieldN`, après le champ `after` (sinon en
 * fin de liste ; jamais avant la clé primaire) ; la taille suit. Renvoie le rang du champ ajouté.
 */
export function addField(edit: ModeEdit, shape: ShapeModel, type: string, after?: number): number | undefined {
  if (!tableKindOf(shape)) return undefined;
  const fields = tableFields(shape);
  const keyed = fields[0]?.kind === 'pk' ? 1 : 0;
  const index = after === undefined ? fields.length : Math.max(keyed, Math.min(after + 1, fields.length));
  const field: Field = { kind: 'property', label: newFieldLabel(fields), type, nullable: false };
  const written = [...fields.slice(0, index), field, ...fields.slice(index)];
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
  return index;
}

/** Retire le champ `index` (sujet 251) ; jamais la clé primaire. La taille suit. */
export function removeField(edit: ModeEdit, shape: ShapeModel, index: number): void {
  const fields = tableFields(shape);
  if (!tableKindOf(shape) || !fields[index] || fields[index].kind === 'pk') return;
  const written = fields.filter((_, i) => i !== index);
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
}

/**
 * Ordre des champs avec le champ `from` à la place `slot` (sujet 252 ; place = rang du champ devant lequel il va, ou le
 * nombre de champs pour la fin) et son nouveau rang ; jamais la clé primaire, et rien ne passe devant elle.
 */
export function movedFields(
  fields: readonly Field[],
  from: number,
  slot: number,
): { fields: Field[]; index: number } | undefined {
  const field = fields[from];
  const keyed = fields[0]?.kind === 'pk' ? 1 : 0;
  if (!field || field.kind === 'pk' || slot < keyed || slot > fields.length) return undefined;
  const to = slot > from ? slot - 1 : slot;
  const rest = fields.filter((_, i) => i !== from);
  return { fields: [...rest.slice(0, to), field, ...rest.slice(to)], index: to };
}

/** Déplace le champ `from` à la place `slot` (`movedFields`) ; renvoie son nouveau rang. */
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
