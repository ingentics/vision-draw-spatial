import type { ShapeModel } from '../../model/types';
import { createBox, createLabel } from '../flat/box';
import { rectPath } from '../geometry/paths';
import { isoBlock } from '../iso/block';
import type { ShapeDefinition } from './types';

const PLACEHOLDER_FILL = '#eeeeee';
const outline = (shape: ShapeModel) => rectPath(shape.bounds);

/**
 * Forme non supportée (SPEC §8.4) : rectangle gris aux dimensions de la forme,
 * avec le nom de forme non reconnu sous le label. En mini-carte : le même rectangle gris.
 */
export const placeholderShape: ShapeDefinition = {
  kind: 'placeholder',
  outline,
  flat: {
    create(shape, ctx) {
      const style = {
        fillColor: PLACEHOLDER_FILL,
        strokeColor: '#9e9e9e',
        dashed: '1',
        fontColor: '#616161',
        fontSize: shape.style.fontSize ?? '11',
        whiteSpace: 'wrap',
      };
      const placeholder = { ...shape, style };
      const box = createBox({ ...placeholder, label: '' }, outline(shape), ctx, { fill: null, stroke: null });
      const text = shape.label.trim() ? `${shape.label}\n[${shape.kind}]` : `[${shape.kind}]`;
      const label = createLabel(placeholder, ctx, text);
      if (label) box.add(label);
      return box;
    },
  },
  // En iso : bloc gris, label d'origine sur le dessus (le nom de forme reste visible en 2D).
  iso: isoBlock(outline, { fill: PLACEHOLDER_FILL, stroke: '#9e9e9e' }),
  minimap: (context, shape, map) => {
    const { x, y } = map.toMinimap(shape.bounds);
    context.fillStyle = PLACEHOLDER_FILL;
    context.fillRect(x, y, Math.max(shape.bounds.width * map.scale, 1), Math.max(shape.bounds.height * map.scale, 1));
  },
};
