import type { ShapeModel } from '../../model/types';
import type { ModeParts } from '../types';
import { moveField, movedFields, removeField, setField } from './operations';
import {
  FIELDS,
  SECONDARY_SCALE,
  TABLE,
  fieldLayout,
  fieldRow,
  fieldsValue,
  isSecondary,
  tableFields,
  tableKindOf,
} from './tables';

/**
 * Champs d'une table RDD comme parties de la forme (sujet 249) : une partie est le rang du champ (`"0"` pour le
 * premier, la clé primaire d'une entité). Un clic sur une ligne la sélectionne ; double-clic : son label sur place.
 */

/** Rang du champ désigné par `part`, s'il existe dans la table. */
export function fieldIndex(shape: ShapeModel, part: string | undefined): number | undefined {
  const index = Number(part);
  return part !== undefined && Number.isInteger(index) && index >= 0 && index < tableFields(shape).length
    ? index
    : undefined;
}

export const fieldParts: ModeParts = {
  at(_page, shape, point) {
    if (!tableKindOf(shape)) return undefined;
    const first = fieldRow(shape, 0);
    if (point.x < first.x || point.x > first.x + first.width || point.y < first.y) return undefined;
    const index = Math.floor((point.y - first.y) / first.height);
    return fieldIndex(shape, String(index)) !== undefined ? String(index) : undefined;
  },
  bounds(_page, shape, part) {
    const index = tableKindOf(shape) ? fieldIndex(shape, part) : undefined;
    return index === undefined ? undefined : fieldRow(shape, index);
  },
  text(_page, shape, part) {
    const kind = tableKindOf(shape);
    const index = kind ? fieldIndex(shape, part) : undefined;
    if (!kind || index === undefined) return undefined;
    const field = tableFields(shape)[index]!;
    const scale = isSecondary(shape) ? SECONDARY_SCALE : 1;
    const row = fieldRow(shape, index);
    const left = row.x + fieldLayout(kind, field).label * scale;
    return {
      text: field.label,
      // Du label au bord droit de la table (le type est couvert pendant la saisie).
      zone: { x: left, y: row.y, width: row.x + row.width - left - TABLE.padding * scale, height: row.height },
      fontSize: TABLE.fieldSize * scale,
      italic: kind.italicFields,
    };
  },
  setText(edit, shape, part, text) {
    const index = fieldIndex(shape, part);
    if (index !== undefined) setField(edit, shape, index, { label: text });
  },
  // Glisser (sujet 252) : place = rang du champ devant lequel il irait (le nombre de champs : la fin) ; hors de la
  // table, devant la clé primaire ou à sa place actuelle : aucune. La clé primaire ne se glisse pas.
  dropAt(_page, shape, part, point) {
    const index = tableKindOf(shape) ? fieldIndex(shape, part) : undefined;
    const fields = tableFields(shape);
    if (index === undefined || fields[index]!.kind === 'pk') return undefined;
    const { x, y, width, height } = shape.bounds;
    if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) return undefined;
    const first = fieldRow(shape, 0);
    const keyed = fields[0]?.kind === 'pk' ? 1 : 0;
    // Place sous le pointeur : la ligne survolée, le champ glissé y prenant sa place.
    const row = Math.floor((point.y - first.y) / first.height);
    const slot = Math.min(fields.length, Math.max(keyed, row > index ? row + 1 : row));
    return slot === index || slot === index + 1 ? undefined : String(slot);
  },
  // Aperçu : la table avec le champ à sa nouvelle place, rien d'écrit.
  preview(shape, part, target) {
    const index = fieldIndex(shape, part);
    const moved = index === undefined ? undefined : movedFields(tableFields(shape), index, Number(target));
    if (!moved) return undefined;
    return {
      shape: { ...shape, style: { ...shape.style, [FIELDS]: fieldsValue(moved.fields)! } },
      part: String(moved.index),
    };
  },
  move(edit, shape, part, target) {
    const index = fieldIndex(shape, part);
    const moved = index === undefined ? undefined : moveField(edit, shape, index, Number(target));
    return moved === undefined ? undefined : String(moved);
  },
  // Suppr : le champ, jamais la clé primaire (sujet 251).
  remove(edit, shape, part) {
    const index = fieldIndex(shape, part);
    if (index !== undefined) removeField(edit, shape, index);
  },
};
