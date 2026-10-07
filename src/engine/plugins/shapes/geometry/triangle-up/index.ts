import type { ShapeDefinition } from '../../../../core/plugins';
import { definition as triangle } from '../triangle';

/** Triangle vers le haut : le triangle tourné par `direction=north` (son contour suit déjà la direction). */
export const definition: ShapeDefinition = {
  ...triangle,
  id: 'triangle-up',
  kinds: ['triangle'],
  matches: (shape) => shape.style.direction === 'north',
  swatch: () => '<path d="M8 23l12-18l12 18z"/>',
  palette: {
    name: 'Triangle (vers le haut)',
    category: 'geometry',
    order: 150,
    keywords: ['triangle', 'haut', 'up', 'pyramide'],
    style: 'triangle;whiteSpace=wrap;html=1;direction=north;',
    value: '',
    width: 80,
    height: 60,
    icon: '<path d="M6 25l14-22l14 22z"/>',
  },
};
