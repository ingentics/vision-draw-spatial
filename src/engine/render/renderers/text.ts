import { rectPath } from '../geometry/paths';
import type { ShapeRenderer } from '../types';
import { createBox } from './box';

/** Texte seul : pas de fond ni de bordure, sauf si le style en définit explicitement. */
export const textRenderer: ShapeRenderer = {
  kind: 'text',
  create(shape, ctx) {
    return createBox(shape, rectPath(shape.bounds), ctx, { fill: null, stroke: null });
  },
};
