import type { ShapeModel } from '../../../../core/model/types';
import { rectPath } from '../../../../core/render/geometry/paths';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Texte seul : pas de fond ni de bordure, sauf si le style en définit explicitement ; reste à plat en iso. */
export const definition: ShapeDefinition = {
  id: 'text',
  ...box((shape: ShapeModel) => rectPath(shape.bounds), { defaults: { fill: null, stroke: null }, volume: false }),
  // Les textes ne sont pas lisibles à l'échelle de la mini-carte.
  minimap: null,
  palette: {
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
};
