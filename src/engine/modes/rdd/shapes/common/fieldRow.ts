import { Color, Group } from 'three';
import type { Point } from '../../../../model/types';
import { fillMesh, strokeMesh } from '../../../../render/meshes';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import type { Field, FieldKind, TableKind } from '../../tables';
import { TABLE, fieldLayout, fieldTypeLabel } from '../../tables';

/**
 * Ligne de champ d'une table RDD (sujet 248) : icône de kind, label, type en gris. Les icônes reprennent les SVG
 * fournis (12 × 12) : un losange de la couleur du kind, cerné de gris ; un champ nullable a un petit losange blanc
 * au centre.
 */

/** Couleur du losange par kind. */
export const FIELD_KIND_COLORS: Record<FieldKind, string> = {
  pk: '#ffd700',
  property: '#4a90e2',
  fk: '#e74c3c',
  'external-fk': '#3c9641',
};
const ICON_STROKE = '#888888';
/** Demi-diagonales du losange et du trou (nullable), épaisseur du contour, dans le cadre de 12. */
const ICON = { half: 5.2, hole: 2, stroke: 1 };
/** Gris du type de donnée. */
export const TYPE_COLOR = '#999999';

/** Losange de demi-diagonale `half` centré en `center`. */
const diamond = (center: Point, half: number): Point[] => [
  { x: center.x, y: center.y - half },
  { x: center.x + half, y: center.y },
  { x: center.x, y: center.y + half },
  { x: center.x - half, y: center.y },
];

/** Icône de kind d'un champ, centrée en `center` ; `scale` : échelle de la table. */
function fieldIcon(field: Field, center: Point, scale: number): Group {
  const group = new Group();
  group.name = 'field-icon';
  group.userData.kind = field.kind;
  group.userData.nullable = field.nullable;
  const unit = (TABLE.fieldIcon.size / 12) * scale;
  const fill = fillMesh(diamond(center, ICON.half * unit), new Color(FIELD_KIND_COLORS[field.kind]), 1);
  group.add(fill);
  const stroke = strokeMesh(diamond(center, ICON.half * unit), new Color(ICON_STROKE), 1, {
    width: ICON.stroke * unit,
    closed: true,
  });
  if (stroke) {
    stroke.renderOrder = PART_ORDER.stroke;
    group.add(stroke);
  }
  if (field.nullable) {
    const hole = fillMesh(diamond(center, ICON.hole * unit), new Color('#ffffff'), 1);
    hole.name = 'field-hole';
    hole.renderOrder = PART_ORDER.stroke + 1;
    group.add(hole);
  }
  return group;
}

/**
 * Dessine une ligne de champ : `left` bord gauche de la table, `y` milieu de la ligne, `scale` échelle de la table.
 */
export function addFieldRow(
  group: Group,
  ctx: RenderContext,
  kind: TableKind,
  field: Field,
  row: { left: number; y: number; scale: number },
): void {
  const { left, y, scale } = row;
  const layout = fieldLayout(kind, field);
  group.add(fieldIcon(field, { x: left + (TABLE.padding + TABLE.fieldIcon.size / 2) * scale, y }, scale));
  addRowText(group, ctx, field.label, { x: left + layout.label * scale, y }, scale, '#000000', kind.italicFields);
  if (layout.type !== undefined) {
    addRowText(group, ctx, fieldTypeLabel(field.type), { x: left + layout.type * scale, y }, scale, TYPE_COLOR);
  }
}

function addRowText(
  group: Group,
  ctx: RenderContext,
  text: string,
  at: Point,
  scale: number,
  color: string,
  italic?: boolean,
): void {
  const object = ctx.text.create({
    text,
    x: at.x,
    y: at.y,
    anchorX: 'left',
    anchorY: 'middle',
    align: 'left',
    fontSize: TABLE.fieldSize * scale,
    color: new Color(color),
    opacity: 1,
    bold: false,
    italic,
  });
  object.name = 'table-text';
  object.renderOrder = PART_ORDER.label;
  group.add(object);
}
