import { Group } from 'three';
import type { Point, ShapeModel } from '../../model/types';
import { dashPattern } from '../geometry/stroke';
import { fillMesh, strokeMesh } from '../meshes';
import { fontStyleBits, styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { RenderContext, TextSpec } from '../types';

/**
 * Brique commune des formes « boîte » : remplissage + bordure suivant un contour fermé,
 * puis label. Les renderers concrets ne fournissent que le contour et les couleurs par défaut.
 */

export interface BoxDefaults {
  fill: string | null;
  stroke: string | null;
}

export const VERTEX_DEFAULTS: BoxDefaults = { fill: '#ffffff', stroke: '#000000' };

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

/** Label d'une forme, placé dans ses bornes selon `align` / `verticalAlign` (SPEC §8.3 : centré par défaut). */
export function createLabel(shape: ShapeModel, ctx: RenderContext, text = shape.label) {
  if (!text.trim() || shape.style.noLabel === '1') return null;
  const { style, bounds } = shape;

  const spacing = styleNumber(style, 'spacing', 2);
  const left = bounds.x + spacing + styleNumber(style, 'spacingLeft', 0);
  const right = bounds.x + bounds.width - spacing - styleNumber(style, 'spacingRight', 0);
  const top = bounds.y + spacing + styleNumber(style, 'spacingTop', 0);
  const bottom = bounds.y + bounds.height - spacing - styleNumber(style, 'spacingBottom', 0);

  const align = (['left', 'right'].includes(style.align ?? '') ? style.align : 'center') as TextSpec['align'];
  const vertical = style.verticalAlign === 'top' ? 'top' : style.verticalAlign === 'bottom' ? 'bottom' : 'middle';

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
    bold: fontStyleBits(style).bold,
    maxWidth: style.whiteSpace === 'wrap' ? Math.max(right - left, 1) : undefined,
  };
  const object = ctx.text.create(spec);
  object.name = 'label';
  object.renderOrder = PART_ORDER.label;
  return object;
}
