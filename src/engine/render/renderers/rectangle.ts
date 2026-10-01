import { cornerRadius, rectPath, roundedRectPath } from '../geometry/paths';
import type { ShapeRenderer } from '../types';
import { VERTEX_DEFAULTS, createBox } from './box';

export const rectangleRenderer: ShapeRenderer = {
  kind: 'rectangle',
  create(shape, ctx) {
    const path =
      shape.style.rounded === '1'
        ? roundedRectPath(shape.bounds, cornerRadius(shape.style, shape.bounds))
        : rectPath(shape.bounds);
    return createBox(shape, path, ctx, VERTEX_DEFAULTS);
  },
};
