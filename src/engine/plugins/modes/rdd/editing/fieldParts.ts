import type { ModeParts } from '../../../../core/plugins';
import { FIELDS, fieldsValue, isDivider, isPrimaryKey, tableFields } from '../tables/fieldModel';
import { moveField, movedFields, removeField, setField } from '../tables/operations';
import { TYPE_COLOR } from '../tables/tableColors';
import { tableKindOf } from '../tables/tableKinds';
import { TABLE, fieldLayout, fieldRow, tableContent, tableScale, tableSize, tableWidth } from '../tables/tableLayout';
import { fieldIndex } from './tableTargets';

/**
 * Champs d'une table RDD comme parties de la forme (sujet 249) : une partie est le rang du champ (`"0"` pour le
 * premier, la clé primaire d'une entité). Un clic sur une ligne la sélectionne ; double-clic : son label sur place.
 */

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
    // La clé primaire reste `id` : pas de texte modifiable (sujet 260).
    if (isPrimaryKey(field)) return undefined;
    const scale = tableScale(shape);
    const row = fieldRow(shape, index);
    // Séparateur (sujet 253) : son label au milieu de la ligne, petit.
    if (isDivider(field)) {
      const inset = TABLE.padding * scale;
      return {
        text: field.label,
        zone: { x: row.x + inset, y: row.y, width: row.width - 2 * inset, height: row.height },
        fontSize: TABLE.divider.size * scale,
        center: true,
        // Sans fond : le trait se redessine autour du texte saisi (aperçu en direct) ; gris comme le texte dessiné.
        transparent: true,
        color: TYPE_COLOR,
      };
    }
    const left = row.x + fieldLayout(kind, field).label * scale;
    return {
      text: field.label,
      // Du label au bord droit de la table (le type est couvert pendant la saisie).
      zone: { x: left, y: row.y, width: row.x + row.width - left - TABLE.padding * scale, height: row.height },
      fontSize: TABLE.fieldSize * scale,
      italic: kind.look.italicFields,
    };
  },
  // Commentaire du champ (sujet 262) : au survol sous son nom, et édité par la touche C ; pas pour un séparateur.
  comment(shape, part) {
    const index = fieldIndex(shape, part);
    const field = index === undefined ? undefined : tableFields(shape)[index];
    return field && !isDivider(field) ? { title: field.label, text: field.comment ?? '' } : undefined;
  },
  setComment(edit, shape, part, text) {
    const index = fieldIndex(shape, part);
    const field = index === undefined ? undefined : tableFields(shape)[index];
    if (index !== undefined && field && !isDivider(field))
      setField(edit, shape, index, { comment: text.trim() || undefined });
  },
  // Saisie en direct (sujet 253) : la table avec ce texte sur la ligne, élargie s'il le faut.
  textPreview(shape, part, text, gridSize) {
    const kind = tableKindOf(shape);
    const index = kind ? fieldIndex(shape, part) : undefined;
    if (!kind || index === undefined) return shape;
    const rows = tableFields(shape).map((row, i) => (i === index ? { ...row, label: text.trim() } : row));
    const width = tableWidth(kind, { ...tableContent(shape), fields: rows });
    return {
      ...shape,
      style: { ...shape.style, [FIELDS]: fieldsValue(rows)! },
      bounds: { ...shape.bounds, width: tableSize(width, gridSize) },
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
    if (index === undefined || isPrimaryKey(fields[index])) return undefined;
    const { x, y, width, height } = shape.bounds;
    if (point.x < x || point.x > x + width || point.y < y || point.y > y + height) return undefined;
    const first = fieldRow(shape, 0);
    const keyed = isPrimaryKey(fields[0]) ? 1 : 0;
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
