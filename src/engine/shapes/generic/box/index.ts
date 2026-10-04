import type { Point, ShapeModel } from '../../../model/types';
import { flatBox } from '../../../render/flat/box';
import type { BoxDefaults } from '../../../render/flat/box';
import { isoBlock } from '../../../render/iso/block';
import type { ShapeDefinition } from '../../types';

/**
 * Boîte générique : une forme entièrement décrite par son contour au sol. Rendu 2D (fond, bordure, label) et, en
 * iso, prisme du contour (repli à plat sans fond). Une forme l'étend : `{ ...box(outline), id, … }`.
 */
export function box(
  outline: (shape: ShapeModel) => Point[],
  options: { defaults?: BoxDefaults; volume?: boolean } = {},
): Pick<ShapeDefinition, 'outline' | 'flat' | 'iso'> {
  return {
    outline,
    flat: flatBox(outline, options.defaults),
    ...(options.volume === false ? {} : { iso: isoBlock(outline, options.defaults) }),
  };
}
