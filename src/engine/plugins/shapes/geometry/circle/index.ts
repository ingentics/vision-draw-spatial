import type { ShapeDefinition } from '../../../../core/shapes/types';
import { definition as ellipse } from '../ellipse';

/** Cercle : l'ellipse aux proportions fixes (`aspect=fixed`). */
export const definition: ShapeDefinition = {
  ...ellipse,
  id: 'circle',
  kinds: ['ellipse'],
  matches: (shape) => shape.style.aspect === 'fixed',
  palette: {
    name: 'Cercle',
    category: 'geometry',
    order: 40,
    keywords: ['rond', 'circle'],
    style: 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;',
    value: '',
    width: 80,
    height: 80,
    icon: '<circle cx="20" cy="14" r="10"/>',
  },
};
