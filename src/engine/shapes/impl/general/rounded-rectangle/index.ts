import type { ShapeDefinition } from '../../../types';
import { definition as rectangle } from '../rectangle';

/** Rectangle arrondi : le rectangle (son contour gère déjà `rounded=1`), avec son élément de palette. */
export const definition: ShapeDefinition = {
  ...rectangle,
  id: 'rounded-rectangle',
  kinds: ['rectangle'],
  matches: (shape) => shape.style.rounded === '1',
  palette: {
    name: 'Rectangle arrondi',
    category: 'general',
    order: 20,
    keywords: ['rect', 'arrondi', 'rounded', 'boîte', 'box'],
    style: 'rounded=1;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<rect x="4" y="6" width="32" height="16" rx="4"/>',
  },
};
