import type { ModeParts, ShapeModel } from '../../../../core/plugins';
import { clamp, rectContains, shapeOf } from '../../../../core/plugins';
import { BODY, BODY_PART, bodyValue, documentBody, hasBody, normalizedBody, setBody } from '../tables/documentBody';
import { FIELDS, fieldsValue, isDivider, isPrimaryKey, isRelation, tableFields } from '../tables/fieldModel';
import { moveField, movedFields, removeField, setField, setPhysicalName } from '../tables/operations';
import { DB_NAME, NAME_PART, PHYSICAL, hasPhysicalLayer, hasPhysicalName, physicalName } from '../tables/physicalLayer';
import { TYPE_COLOR, headerTextColor } from '../tables/tableColors';
import { tableKindOf } from '../tables/tableKinds';
import {
  TABLE,
  bodyZone,
  FIELD_LABEL_X,
  fieldRow,
  nameZone,
  tableContent,
  tableScale,
  tableSize,
  tableWidth,
} from '../tables/tableLayout';
import { fieldIndex } from './tableTargets';
import { keys } from '../keys';

/**
 * Champs d'une table RDD comme parties de la forme (sujet 249) : une partie est le rang du champ (`"0"` pour le
 * premier, la clé primaire d'une entité). Un clic sur une ligne la sélectionne ; double-clic : son label sur place.
 * Le corps d'un document (sujet 269) est la partie `body`, au texte modifiable sans être sélectionnable.
 */

/** Les champs de la table sont-ils édités dans la couche physique (sujet 414) ? */
const physicalEdit = (shape: ShapeModel, current: string | undefined) =>
  current === PHYSICAL && hasPhysicalLayer(shape);

/** Le titre est-il le nom en base (couche physique, pas pour un fragment) ? */
const physicalTitle = (shape: ShapeModel, current: string | undefined) =>
  current === PHYSICAL && hasPhysicalName(shape);

/** Forme avec ce corps (aperçu de la saisie), rien d'écrit. */
function withBody(shape: ShapeModel, text: string): ShapeModel {
  const { [keys.key(BODY)]: _previous, ...style } = shape.style;
  const value = bodyValue(normalizedBody(text));
  return { ...shape, style: value === undefined ? style : { ...style, [keys.key(BODY)]: value } };
}

export const fieldParts: ModeParts = {
  at(_page, shape, point) {
    if (!tableKindOf(shape)) return undefined;
    const first = fieldRow(shape, 0);
    // Pas de borne basse : sous le dernier champ, `fieldIndex` écarte le rang (la forme peut déborder de ses lignes).
    if (point.x < first.x || point.x > first.x + first.width || point.y < first.y) return undefined;
    const index = Math.floor((point.y - first.y) / first.height);
    return fieldIndex(shape, String(index)) !== undefined ? String(index) : undefined;
  },
  // Double-clic dans le corps d'un document : son texte sur place, en plusieurs lignes (sujet 269).
  textAt(_page, shape, point) {
    return hasBody(shape) && rectContains(bodyZone(shape), point) ? BODY_PART : undefined;
  },
  bounds(_page, shape, part) {
    const index = tableKindOf(shape) ? fieldIndex(shape, part) : undefined;
    return index === undefined ? undefined : fieldRow(shape, index);
  },
  // Flèche de relation survolée ou sélectionnée (sujet 373) : le champ qu'elle a créé dans sa table d'arrivée.
  edgePart(page, edge) {
    const target = shapeOf(page, edge.targetId);
    if (!target || !tableKindOf(target)) return undefined;
    const index = tableFields(target).findIndex((row) => isRelation(row) && row.edge === edge.id);
    return index < 0 ? undefined : { shapeId: target.id, part: String(index) };
  },
  // Couche physique (sujet 414) : le titre est le nom en base de la table, une partie éditée à la place de son texte.
  labelPart: (_page, shape, current) => (physicalTitle(shape, current) ? NAME_PART : undefined),
  text(_page, shape, part, current) {
    const physical = physicalEdit(shape, current);
    if (part === NAME_PART)
      return physicalTitle(shape, current)
        ? {
            text: physicalName(shape) ?? '',
            zone: nameZone(shape),
            fontSize: TABLE.nameSize * tableScale(shape),
            center: true,
            bold: true,
            // Sur place, comme le nom dessiné : sans fond, de la couleur du texte de l'entête.
            transparent: true,
            color: headerTextColor(shape.style),
          }
        : undefined;
    if (part === BODY_PART)
      return hasBody(shape)
        ? {
            text: documentBody(shape),
            zone: bodyZone(shape),
            fontSize: TABLE.body.size * tableScale(shape),
            multiline: true,
            monospace: true,
          }
        : undefined;
    const kind = tableKindOf(shape);
    const index = kind ? fieldIndex(shape, part) : undefined;
    if (!kind || index === undefined) return undefined;
    const field = tableFields(shape)[index]!;
    // La clé primaire reste `id` : pas de texte modifiable (sujet 260), sauf son nom en base (sujet 414).
    if (isPrimaryKey(field) && !physical) return undefined;
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
    const left = row.x + FIELD_LABEL_X * scale;
    return {
      // Couche physique : le nom en base du champ, vide s'il n'en a pas.
      text: physical ? (field.dbName ?? '') : field.label,
      // Du label au bord droit de la table.
      zone: { x: left, y: row.y, width: row.x + row.width - left - TABLE.padding * scale, height: row.height },
      fontSize: TABLE.fieldSize * scale,
      // Sans fond (sujet 372) : la saisie prend la place du label masqué, le type la suit dans l'aperçu en direct.
      transparent: true,
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
  textPreview(shape, part, text, sizing, current) {
    if (part === BODY_PART) return hasBody(shape) ? withBody(shape, text) : shape;
    const kind = tableKindOf(shape);
    const physical = physicalEdit(shape, current);
    if (kind && physicalTitle(shape, current) && part === NAME_PART) {
      const name = text.trim() || undefined;
      const { [keys.key(DB_NAME)]: _previous, ...style } = shape.style;
      const width = tableWidth(kind, { ...tableContent(shape), physicalName: name }, sizing.measureText);
      return {
        ...shape,
        style: name === undefined ? style : { ...style, [keys.key(DB_NAME)]: name },
        bounds: { ...shape.bounds, width: tableSize(width, sizing.gridSize) },
      };
    }
    const index = kind ? fieldIndex(shape, part) : undefined;
    if (!kind || index === undefined) return shape;
    const rows = tableFields(shape).map((row, i) => {
      if (i !== index) return row;
      if (physical && !isDivider(row)) return { ...row, dbName: text.trim() || undefined };
      return { ...row, label: text.trim() };
    });
    const width = tableWidth(kind, { ...tableContent(shape), fields: rows }, sizing.measureText);
    return {
      ...shape,
      style: { ...shape.style, [keys.key(FIELDS)]: fieldsValue(rows)! },
      bounds: { ...shape.bounds, width: tableSize(width, sizing.gridSize) },
    };
  },
  setText(edit, shape, part, text, current) {
    if (part === BODY_PART) return setBody(edit, shape, text);
    const physical = physicalEdit(shape, current);
    if (part === NAME_PART) return physicalTitle(shape, current) ? setPhysicalName(edit, shape, text) : undefined;
    const index = fieldIndex(shape, part);
    if (index === undefined) return;
    // Couche physique : le nom en base du champ (vide le retire) ; un séparateur garde son label.
    if (physical && !isDivider(tableFields(shape)[index]!)) setField(edit, shape, index, { dbName: text.trim() });
    else setField(edit, shape, index, { label: text });
  },
  // Glisser (sujet 252) : place = rang du champ devant lequel il irait (le nombre de champs : la fin) ; hors de la
  // table, devant la clé primaire ou à sa place actuelle : aucune. La clé primaire ne se glisse pas.
  dropAt(_page, shape, part, point) {
    const index = tableKindOf(shape) ? fieldIndex(shape, part) : undefined;
    const fields = tableFields(shape);
    if (index === undefined || isPrimaryKey(fields[index])) return undefined;
    if (!rectContains(shape.bounds, point)) return undefined;
    const first = fieldRow(shape, 0);
    const keyed = isPrimaryKey(fields[0]) ? 1 : 0;
    // Place sous le pointeur : la ligne survolée, le champ glissé y prenant sa place.
    const row = Math.floor((point.y - first.y) / first.height);
    const slot = clamp(row > index ? row + 1 : row, keyed, fields.length);
    return slot === index || slot === index + 1 ? undefined : String(slot);
  },
  // Aperçu : la table avec le champ à sa nouvelle place, rien d'écrit.
  preview(shape, part, target) {
    const index = fieldIndex(shape, part);
    const moved = index === undefined ? undefined : movedFields(tableFields(shape), index, Number(target));
    if (!moved) return undefined;
    return {
      shape: { ...shape, style: { ...shape.style, [keys.key(FIELDS)]: fieldsValue(moved.fields)! } },
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
