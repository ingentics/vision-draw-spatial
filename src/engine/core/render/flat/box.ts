import { Group } from 'three';
import type { Point, Rect, ShapeModel } from '../../model/types';
import { dashPattern } from '../geometry/stroke';
import { labelInsets, outsideLabelBox } from '../labelPosition';
import { fillMesh, strokeMesh } from '../meshes';
import { textFormat, styleNumber, styleOpacity, styleFlag } from '../../model/styleValues';
import { labelBackground, styleColor } from '../styleColors';
import { PART_ORDER } from '../types';
import type { RenderContext, TextSpec } from '../types';
import type { SceneRenderer } from '../../../shapes/types';

/**
 * Rendu à plat (niveau `flat`) des formes « boîte » : remplissage + bordure suivant le contour
 * de la forme, puis label. Les définitions de formes ne fournissent que le contour et les
 * couleurs par défaut.
 */

export interface BoxDefaults {
  fill: string | null;
  stroke: string | null;
}

export const VERTEX_DEFAULTS: BoxDefaults = { fill: '#ffffff', stroke: '#000000' };

/** Rendu à plat d'une forme définie par son contour. */
export function flatBox(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults = VERTEX_DEFAULTS,
): SceneRenderer {
  return { create: (shape, ctx) => createBox(shape, outline(shape), ctx, defaults) };
}

export function createBox(shape: ShapeModel, path: Point[], ctx: RenderContext, defaults: BoxDefaults): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const { style } = shape;

  const fill = styleColor(style, 'fillColor', defaults.fill);
  if (fill) group.add(fillMesh(path, fill, styleOpacity(style, 'fillOpacity')));

  const stroke = styleColor(style, 'strokeColor', defaults.stroke);
  const strokeWidth = styleNumber(style, 'strokeWidth', 1);
  if (stroke && strokeWidth > 0) {
    const mesh = strokeMesh(path, stroke, styleOpacity(style, 'strokeOpacity'), {
      width: strokeWidth,
      closed: true,
      dash: dashPattern(style, strokeWidth),
    });
    if (mesh) group.add(mesh);
  }

  const label = createLabel(shape, ctx);
  if (label) group.add(label);
  return group;
}

/**
 * Label d'une forme, placé dans sa zone de texte (`zone`, les bornes par défaut) selon `align` / `verticalAlign`
 * (SPEC §8.3 : centré par défaut). Un label hors de la forme (`labelPosition`, `verticalLabelPosition`) se place
 * à côté des bornes, comme dans draw.io, quelle que soit la zone propre à la forme.
 */
export function createLabel(shape: ShapeModel, ctx: RenderContext, text = shape.label, zone: Rect = shape.bounds) {
  if (!text.trim() || styleFlag(shape.style, 'noLabel')) return null;
  const { style } = shape;
  const outside = outsideLabelBox(shape.bounds, style);
  const bounds = outside ?? zone;

  const align = (['left', 'right'].includes(style.align ?? '') ? style.align : 'center') as TextSpec['align'];
  const vertical = style.verticalAlign === 'top' ? 'top' : style.verticalAlign === 'bottom' ? 'bottom' : 'middle';

  const insets = labelInsets(style);
  const left = bounds.x + insets.left;
  const right = bounds.x + bounds.width - insets.right;
  const top = bounds.y + insets.top;
  const bottom = bounds.y + bounds.height - insets.bottom;

  const spec: TextSpec = {
    text,
    x: align === 'left' ? left : align === 'right' ? right : (left + right) / 2,
    y: vertical === 'top' ? top : vertical === 'bottom' ? bottom : (top + bottom) / 2,
    anchorX: align,
    anchorY: vertical,
    align,
    fontSize: styleNumber(style, 'fontSize', 11),
    color: styleColor(style, 'fontColor', '#000000')!,
    opacity: styleOpacity(style, 'textOpacity'),
    ...textFormat(style, text === shape.label ? shape.rich : undefined),
    maxWidth: style.whiteSpace === 'wrap' ? Math.max(right - left, 1) : undefined,
    fit: styleFlag(style, 'fitText')
      ? { width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
      : undefined,
    background: labelBackground(style, null, ctx.background),
  };
  const object = ctx.text.create(spec);
  object.name = 'label';
  // Cellule qui porte le texte : l'éditeur en place masque ce label pendant la saisie.
  object.userData.labelCellId = shape.id;
  // Hors de la forme : posé au sol à côté du volume en iso (`createShapeObject`).
  if (outside) object.userData.outsideLabel = true;
  object.renderOrder = PART_ORDER.label;
  return object;
}
