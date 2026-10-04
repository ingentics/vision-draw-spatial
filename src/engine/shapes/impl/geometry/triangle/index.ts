import type { ShapeModel } from '../../../../model/types';
import { orientedPath } from '../../../../render/geometry/orient';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Triangle isocèle de draw.io (`mxTriangle`) : base à gauche, pointe au milieu du bord droit, orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) => [
    { x: 0, y: 0 },
    { x: w, y: h / 2 },
    { x: 0, y: h },
  ]);
}

/** Triangle (`triangle`, vers la droite par défaut) : boîte du contour ; flèches sur `trianglePerimeter`. */
export const definition: ShapeDefinition = {
  id: 'triangle',
  ...box(outline),
  swatch: () => '<path d="M10 4l20 10l-20 10z"/>',
  palette: {
    name: 'Triangle',
    category: 'geometry',
    order: 140,
    keywords: ['triangle', 'flèche', 'lecture', 'play'],
    style: 'triangle;whiteSpace=wrap;html=1;',
    value: '',
    width: 60,
    height: 80,
    icon: '<path d="M12 2l16 12l-16 12z"/>',
  },
};
