import { ellipsePath } from '../geometry/paths';
import type { ShapeRenderer } from '../types';
import { VERTEX_DEFAULTS, createBox } from './box';

export const ellipseRenderer: ShapeRenderer = {
  kind: 'ellipse',
  create(shape, ctx) {
    return createBox(shape, ellipsePath(shape.bounds), ctx, VERTEX_DEFAULTS);
  },
};
