import type { ShapeModel } from '../../model/types';
import type { ModeParts } from '../types';
import { removeField, setField } from './operations';
import { SECONDARY_SCALE, TABLE, fieldLayout, fieldRow, isSecondary, tableFields, tableKindOf } from './tables';

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
  // Suppr : le champ, jamais la clé primaire (sujet 251).
  remove(edit, shape, part) {
    const index = fieldIndex(shape, part);
    if (index !== undefined) removeField(edit, shape, index);
  },
};
