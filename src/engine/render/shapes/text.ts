import type { ShapeModel } from '../../model/types';
import { flatBox } from '../flat/box';
import { rectPath } from '../geometry/paths';
import type { ShapeDefinition } from './types';

const outline = (shape: ShapeModel) => rectPath(shape.bounds);

/** Texte seul : pas de fond ni de bordure, sauf si le style en définit explicitement. */
export const textShape: ShapeDefinition = {
  kind: 'text',
  outline,
  flat: flatBox(outline, { fill: null, stroke: null }),
  // Les textes ne sont pas lisibles à l'échelle de la mini-carte.
  minimap: null,
};
