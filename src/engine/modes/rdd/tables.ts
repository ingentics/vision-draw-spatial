import type { ShapeModel } from '../../model/types';
import { readableOn } from '../../render/styleValues';
import type { ModeEdit } from '../types';
import {
  FIELDS,
  PRIMARY_KEY,
  SECONDARY,
  SECONDARY_SCALE,
  TABLE,
  headerHeight,
  isSecondary,
  tableFields,
  tableHeight,
  tableKindOf,
} from './table';

/**
 * Opérations du mode RDD sur une table (sujet 179) : champs, couleur d'entête, table secondaire. Chacune est une
 * opération de mode (une étape d'annulation) ; la forme garde la hauteur de ses champs.
 */

/** Arrondi des tailles écrites (échelle 0,8 : pas de traîne de flottants). */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Champs de la table, depuis le texte du panneau (un par ligne, lignes vides ignorées) ; la hauteur suit. Une table à
 * clé primaire la garde en tête : le texte ne donne que les champs suivants.
 */
export function setFields(edit: ModeEdit, shape: ShapeModel, text: string | undefined): void {
  const kind = tableKindOf(shape);
  if (!kind) return;
  const lines = (text ?? '')
    .split('\n')
    .map((field) => field.trim())
    .filter(Boolean);
  const fields = kind.primaryKey ? [PRIMARY_KEY, ...lines.filter((f) => f !== PRIMARY_KEY)] : lines;
  edit.setElementAttribute(shape.id, FIELDS, fields.length > 0 ? JSON.stringify(fields) : undefined);
  edit.setShapeBounds(shape.id, {
    ...shape.bounds,
    height: round(tableHeight(kind, isSecondary(shape), fields.length)),
  });
}

/** Champs en texte pour le panneau (un par ligne), sans la clé primaire (elle n'y est pas modifiable). */
export function fieldsText(shape: ShapeModel): string {
  const fields = tableFields(shape);
  return (tableKindOf(shape)?.primaryKey ? fields.slice(1) : fields).join('\n');
}

/** Couleur de l'entête (`fillColor`) ; le texte du fichier suit le contraste pour draw.io (`fontColor`). */
export function setHeaderColor(edit: ModeEdit, shape: ShapeModel, color: string | undefined): void {
  if (!tableKindOf(shape) || !color) return;
  edit.setElementStyle(shape.id, 'fillColor', color);
  edit.setElementStyle(shape.id, 'fontColor', readableOn(color));
}

/**
 * Table secondaire : la forme est mise à l'échelle depuis son coin haut-gauche (× 0,8 ou ÷ 0,8) ; entête et taille
 * du nom suivent dans le style, pour draw.io.
 */
export function setSecondary(edit: ModeEdit, shape: ShapeModel, secondary: boolean): void {
  const kind = tableKindOf(shape);
  if (!kind || isSecondary(shape) === secondary) return;
  const factor = secondary ? SECONDARY_SCALE : 1 / SECONDARY_SCALE;
  const { bounds } = shape;
  edit.setElementAttribute(shape.id, SECONDARY, secondary ? '1' : undefined);
  edit.setShapeBounds(shape.id, {
    ...bounds,
    width: round(bounds.width * factor),
    height: round(bounds.height * factor),
  });
  edit.setElementStyle(shape.id, 'startSize', String(round(headerHeight(kind, secondary))));
  edit.setElementStyle(shape.id, 'fontSize', String(round(TABLE.nameSize * (secondary ? SECONDARY_SCALE : 1))));
}
