import { Color, Group } from 'three';
import { PART_ORDER, fillMesh, markPart, rectPath, strokeMesh } from '../../../../../core/plugins';
import type { Point, RenderContext } from '../../../../../core/plugins';
import type { Divider, Field } from '../../tables/fieldModel';
import { layerFieldTexts, physicalMissing } from '../../tables/physicalLayer';
import { DIVIDER_STROKE, FIELD_ICON_STROKE, MISSING_COLOR, TYPE_COLOR, fieldIconColor } from '../../tables/tableColors';
import { TABLE, dividerLabelWidth, fieldLayout } from '../../tables/tableLayout';

/**
 * Ligne de champ d'une table RDD (sujet 248) : icône de kind, label, type (ou préfixe, sujet 268) en gris. Les
 * icônes reprennent les SVG fournis (12 × 12, `docs/assets/`) : un losange de la couleur du kind (violet `embed.svg`
 * pour un champ non structuré, sujet 375), cerné de gris ; un champ nullable a un petit losange blanc au centre.
 */

/** Demi-diagonales du losange et du trou (nullable), épaisseur du contour, dans le cadre de 12. */
const ICON = { half: 5.2, hole: 2, stroke: 1 };

/** Losange de demi-diagonale `half` centré en `center`. */
const diamond = (center: Point, half: number): Point[] => [
  { x: center.x, y: center.y - half },
  { x: center.x + half, y: center.y },
  { x: center.x, y: center.y + half },
  { x: center.x - half, y: center.y },
];

/**
 * Icône d'alerte d'un nom ou type physique manquant (sujet 425), dans le cadre de 12 : triangle rouge, pointe en haut, avec un
 * point d'exclamation blanc (barre et point).
 */
const WARNING = {
  triangle: [
    { x: 6, y: 0.6 },
    { x: 11.6, y: 11 },
    { x: 0.4, y: 11 },
  ],
  bar: { x: 5.3, y: 3.8, width: 1.4, height: 3.8 },
  dot: { x: 5.3, y: 8.6, width: 1.4, height: 1.4 },
};

/** Icône d'alerte, bord gauche en `left`, centrée verticalement en `y`. */
function warningIcon(left: number, y: number, scale: number): Group {
  const group = new Group();
  group.name = 'field-warning';
  const unit = (TABLE.warning.size / 12) * scale;
  const at = (p: Point): Point => ({ x: left + p.x * unit, y: y + (p.y - 6) * unit });
  const triangle = fillMesh(WARNING.triangle.map(at), new Color(MISSING_COLOR), 1);
  triangle.renderOrder = PART_ORDER.fill + 0.6;
  group.add(triangle);
  for (const box of [WARNING.bar, WARNING.dot]) {
    const mark = fillMesh(rectPath(box).map(at), new Color('#ffffff'), 1);
    mark.renderOrder = PART_ORDER.stroke + 1;
    group.add(mark);
  }
  return group;
}

/** Icône de kind d'un champ, centrée en `center` ; `scale` : échelle de la table. */
function fieldIcon(field: Field, center: Point, scale: number): Group {
  const group = new Group();
  group.name = 'field-icon';
  // Marqueurs pour les tests, non lus par le moteur.
  group.userData.kind = field.kind;
  group.userData.nullable = field.nullable;
  const unit = (TABLE.fieldIcon.size / 12) * scale;
  const fill = fillMesh(diamond(center, ICON.half * unit), new Color(fieldIconColor(field)), 1);
  // Au-dessus du fond blanc de la table (même ordre sinon : selon le tri de Three.js, le fond pouvait le couvrir).
  fill.renderOrder = PART_ORDER.fill + 0.6;
  group.add(fill);
  const stroke = strokeMesh(diamond(center, ICON.half * unit), new Color(FIELD_ICON_STROKE), 1, {
    width: ICON.stroke * unit,
    closed: true,
  });
  if (stroke) {
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
 * Dessine une ligne de champ : `left` / `right` bords de la table, `y` milieu de la ligne, `scale` échelle de la table ;
 * `physical` : textes de la couche physique (sujet 414), une valeur manquante remplacée par la logique en rouge
 * italique, et l'icône d'alerte calée à droite (sujet 425).
 */
export function addFieldRow(
  group: Group,
  ctx: RenderContext,
  field: Field,
  row: { left: number; right: number; y: number; scale: number; part: string; physical: boolean },
): void {
  const { left, right, y, scale, part, physical } = row;
  const layout = fieldLayout(field, ctx.measureText, physical);
  const { label, note } = layerFieldTexts(field, physical);
  group.add(fieldIcon(field, { x: left + (TABLE.padding + TABLE.fieldIcon.size / 2) * scale, y }, scale));
  const size = TABLE.fieldSize * scale;
  addRowText(
    group,
    ctx,
    label.text,
    { x: left + layout.label * scale, y },
    {
      size,
      color: label.missing ? MISSING_COLOR : '#000000',
      italic: label.missing,
      part,
    },
  );
  if (layout.type !== undefined) {
    addRowText(
      group,
      ctx,
      note.text,
      { x: left + layout.type * scale, y },
      {
        size,
        color: note.missing ? MISSING_COLOR : TYPE_COLOR,
        italic: note.missing,
      },
    );
  }
  if (physical && physicalMissing(field))
    group.add(warningIcon(right - (TABLE.padding + TABLE.warning.size) * scale, y, scale));
}

/**
 * Dessine un séparateur (sujet 253) : trait horizontal sur la largeur de la table (marges comprises), interrompu
 * autour de son label, petit et gris, au milieu ; `left` / `width` : la table, `y` milieu de la ligne.
 */
export function addDividerRow(
  group: Group,
  ctx: RenderContext,
  divider: Divider,
  row: { left: number; width: number; y: number; scale: number; part: string },
): void {
  const { left, width, y, scale, part } = row;
  const { size } = TABLE.divider;
  const start = left + TABLE.padding * scale;
  const end = left + width - TABLE.padding * scale;
  const center = left + width / 2;
  const half = (dividerLabelWidth(divider, ctx.measureText) / 2) * scale;
  const pieces: Point[][] = half
    ? [
        [
          { x: start, y },
          { x: center - half, y },
        ],
        [
          { x: center + half, y },
          { x: end, y },
        ],
      ]
    : [
        [
          { x: start, y },
          { x: end, y },
        ],
      ];
  for (const piece of pieces) {
    if (piece[1]!.x <= piece[0]!.x) continue;
    const mesh = strokeMesh(piece, new Color(DIVIDER_STROKE), 1, { width: scale, closed: false });
    if (!mesh) continue;
    mesh.name = 'divider';
    group.add(mesh);
  }
  if (divider.label)
    addRowText(
      group,
      ctx,
      divider.label,
      { x: center, y },
      {
        size: size * scale,
        color: TYPE_COLOR,
        center: true,
        part,
      },
    );
}

function addRowText(
  group: Group,
  ctx: RenderContext,
  text: string,
  at: Point,
  style: { size: number; color: string; italic?: boolean; center?: boolean; part?: string },
): void {
  const { size, color, italic, center, part } = style;
  const object = ctx.text.create({
    text,
    x: at.x,
    y: at.y,
    anchorX: center ? 'center' : 'left',
    anchorY: 'middle',
    align: center ? 'center' : 'left',
    fontSize: size,
    color: new Color(color),
    opacity: 1,
    bold: false,
    italic,
  });
  object.name = 'table-text';
  // Texte d'une partie (label de la ligne) : masqué pendant son édition sur place (sujet 253).
  if (part !== undefined) markPart(object, part);
  object.renderOrder = PART_ORDER.label;
  group.add(object);
}
