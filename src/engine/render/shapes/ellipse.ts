import type { ShapeModel } from '../../model/types';
import { flatBox } from '../flat/box';
import { isoBlock } from '../iso/block';
import { ellipsePath } from '../geometry/paths';
import type { ShapeDefinition } from './types';

const outline = (shape: ShapeModel) => ellipsePath(shape.bounds);

export const ellipseShape: ShapeDefinition = {
  kind: 'ellipse',
  outline,
  flat: flatBox(outline),
  // En iso : un bloc en volume (repli à plat sans fond).
  iso: isoBlock(outline),
};
