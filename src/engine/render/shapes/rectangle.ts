import type { ShapeModel } from '../../model/types';
import { flatBox } from '../flat/box';
import { isoBlock } from '../iso/block';
import { cornerRadius, rectPath, roundedRectPath } from '../geometry/paths';
import type { ShapeDefinition } from './types';

function outline(shape: ShapeModel) {
  return shape.style.rounded === '1'
    ? roundedRectPath(shape.bounds, cornerRadius(shape.style, shape.bounds))
    : rectPath(shape.bounds);
}

/** Rectangle, arrondi ou non (`rounded=1`, `arcSize`). */
export const rectangleShape: ShapeDefinition = {
  kind: 'rectangle',
  outline,
  flat: flatBox(outline),
  // En iso : un bloc en volume (repli à plat sans fond).
  iso: isoBlock(outline),
};
