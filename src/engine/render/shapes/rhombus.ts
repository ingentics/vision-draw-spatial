import type { ShapeModel } from '../../model/types';
import { flatBox } from '../flat/box';
import { orientedPath } from '../geometry/orient';
import { isoBlock } from '../iso/block';
import type { ShapeDefinition } from './types';

/** Losange inscrit dans les bornes, sommets au milieu des côtés (mxRhombus), orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) => [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ]);
}

/** Losange (`rhombus`, « Diamond » de la palette draw.io) : prisme du contour en iso / 3D. */
export const rhombusShape: ShapeDefinition = {
  kind: 'rhombus',
  outline,
  flat: flatBox(outline),
  iso: isoBlock(outline),
};
