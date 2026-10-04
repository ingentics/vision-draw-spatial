import type { Point, ShapeModel } from '../../../model/types';
import { flatBox } from '../../../render/flat/box';
import type { BoxDefaults } from '../../../render/flat/box';
import { polygonArc, roundedPolygon } from '../../../render/geometry/paths';
import { isoBlock } from '../../../render/iso/block';
import type { ShapeDefinition } from '../../types';

/**
 * Boîte générique : une forme entièrement décrite par son contour au sol. Rendu 2D (fond, bordure, label) et, en
 * iso, prisme du contour (repli à plat sans fond). Une forme l'étend : `{ ...box(outline), id, … }`.
 *
 * `roundable` : polygone que draw.io sait arrondir (`rounded=1`, rayon `arcSize / 2`, `mxShape.addPoints`) ; le
 * contour arrondi sert alors partout (2D, volume, clic, mini-carte), et le panneau propose « Coins arrondis ».
 */
export function box(
  outline: (shape: ShapeModel) => Point[],
  options: { defaults?: BoxDefaults; volume?: boolean; roundable?: boolean } = {},
): Pick<ShapeDefinition, 'outline' | 'flat' | 'iso' | 'properties'> {
  const path = options.roundable
    ? (shape: ShapeModel) => {
        const points = outline(shape);
        return shape.style.rounded === '1' ? roundedPolygon(points, polygonArc(shape.style)) : points;
      }
    : outline;
  return {
    outline: path,
    flat: flatBox(path, options.defaults),
    ...(options.volume === false ? {} : { iso: isoBlock(path, options.defaults) }),
    ...(options.roundable
      ? { properties: [{ type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' }] }
      : {}),
  };
}
