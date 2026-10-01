import { rectPath } from '../geometry/paths';
import type { ShapeRenderer } from '../types';
import { createBox, createLabel } from './box';

/**
 * Forme non supportée (SPEC §8.4) : rectangle gris aux dimensions de la forme,
 * avec le nom de forme non reconnu sous le label.
 */
export const placeholderRenderer: ShapeRenderer = {
  kind: 'placeholder',
  create(shape, ctx) {
    const style = {
      fillColor: '#eeeeee',
      strokeColor: '#9e9e9e',
      dashed: '1',
      fontColor: '#616161',
      fontSize: shape.style.fontSize ?? '11',
      whiteSpace: 'wrap',
    };
    const placeholder = { ...shape, style };
    const box = createBox({ ...placeholder, label: '' }, rectPath(shape.bounds), ctx, { fill: null, stroke: null });
    const text = shape.label.trim() ? `${shape.label}\n[${shape.kind}]` : `[${shape.kind}]`;
    const label = createLabel(placeholder, ctx, text);
    if (label) box.add(label);
    return box;
  },
};
