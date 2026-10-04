import type { ShapeModel } from '../../model/types';
import { flatBox } from '../../render/flat/box';
import { rectPath } from '../../render/geometry/paths';
import type { ShapeDefinition } from '../types';

const outline = (shape: ShapeModel) => rectPath(shape.bounds);

/** Texte seul : pas de fond ni de bordure, sauf si le style en définit explicitement. */
export const definition: ShapeDefinition = {
  kind: 'text',
  outline,
  flat: flatBox(outline, { fill: null, stroke: null }),
  // Les textes ne sont pas lisibles à l'échelle de la mini-carte.
  minimap: null,
  templates: [
    {
      id: 'text',
      name: 'Texte',
      category: 'general',
      order: 100,
      keywords: ['label', 'texte', 'text', 'étiquette'],
      style: 'text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;',
      value: 'Texte',
      width: 60,
      height: 30,
      icon: '<text x="20" y="18" text-anchor="middle">Abc</text>',
    },
  ],
};
