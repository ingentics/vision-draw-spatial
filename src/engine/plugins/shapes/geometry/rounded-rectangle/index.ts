import type { ShapeDefinition } from '../../../../core/shapes/types';
import { definition as rectangle } from '../rectangle';
import { styleFlag } from '../../../../core/model/styleValues';

/** Rectangle arrondi : le rectangle (son contour gère déjà `rounded=1`), avec son élément de palette. */
export const definition: ShapeDefinition = {
  ...rectangle,
  id: 'rounded-rectangle',
  kinds: ['rectangle'],
  matches: (shape) => styleFlag(shape.style, 'rounded'),
  palette: {
    name: 'Rectangle arrondi',
    category: 'geometry',
    order: 20,
    keywords: ['rect', 'arrondi', 'rounded', 'boîte', 'box'],
    style: 'rounded=1;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<rect x="4" y="6" width="32" height="16" rx="4"/>',
  },
};
