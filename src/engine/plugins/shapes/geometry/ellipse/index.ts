import { ellipsePath } from '../../../../core/plugins';
import type { ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Ellipse : boîte de l'ellipse inscrite dans les bornes. */
export const definition: ShapeDefinition = {
  id: 'ellipse',
  ...box((shape: ShapeModel) => ellipsePath(shape.bounds)),
  // Ellipse exacte (le contour n'en est qu'une approximation).
  contains({ bounds: { x, y, width, height } }, point) {
    const rx = width / 2;
    const ry = height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (point.x - (x + rx)) / rx;
    const dy = (point.y - (y + ry)) / ry;
    return dx * dx + dy * dy <= 1;
  },
  swatch: () => '<ellipse cx="20" cy="14" rx="15" ry="10"/>',
  palette: {
    name: 'Ellipse',
    category: 'geometry',
    order: 30,
    keywords: ['ovale', 'oval'],
    style: 'ellipse;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 80,
    icon: '<ellipse cx="20" cy="14" rx="16" ry="9"/>',
  },
};
