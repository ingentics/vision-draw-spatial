import type { ShapeModel } from '../../model/types';
import { flatBox } from '../../render/flat/box';
import { ellipsePath } from '../../render/geometry/paths';
import { isoBlock } from '../../render/iso/block';
import type { ShapeDefinition } from '../types';

const outline = (shape: ShapeModel) => ellipsePath(shape.bounds);

export const definition: ShapeDefinition = {
  kind: 'ellipse',
  outline,
  flat: flatBox(outline),
  // En iso : un bloc en volume (repli à plat sans fond).
  iso: isoBlock(outline),
  // Ellipse exacte (le contour n'en est qu'une approximation).
  contains({ bounds: { x, y, width, height } }, point) {
    const rx = width / 2;
    const ry = height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (point.x - (x + rx)) / rx;
    const dy = (point.y - (y + ry)) / ry;
    return dx * dx + dy * dy <= 1;
  },
  templates: [
    {
      id: 'ellipse',
      name: 'Ellipse',
      category: 'general',
      order: 30,
      keywords: ['ovale', 'oval'],
      style: 'ellipse;whiteSpace=wrap;html=1;',
      value: '',
      width: 120,
      height: 80,
      icon: '<ellipse cx="20" cy="14" rx="16" ry="9"/>',
    },
    {
      id: 'circle',
      name: 'Cercle',
      category: 'general',
      order: 40,
      keywords: ['rond', 'circle'],
      style: 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;',
      value: '',
      width: 80,
      height: 80,
      icon: '<circle cx="20" cy="14" r="10"/>',
    },
  ],
  templateOf: (style) => (style.aspect === 'fixed' ? 'circle' : 'ellipse'),
  swatch: () => '<ellipse cx="20" cy="14" rx="15" ry="10"/>',
};
