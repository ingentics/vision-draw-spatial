import { orientation, orientedPath } from '../../../../core/plugins';
import type { ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Triangle isocèle de draw.io (`mxTriangle`) : base à gauche, pointe au milieu du bord droit, orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) => [
    { x: 0, y: 0 },
    { x: w, y: h / 2 },
    { x: 0, y: h },
  ]);
}

/**
 * Zone du texte (sujet 341) : pointe en haut ou en bas à l'écran, les 2/3 du côté de la base, loin de la pointe ;
 * pointe à gauche ou à droite, les bornes.
 */
function label(shape: ShapeModel) {
  const tip = orientation(shape.bounds, shape.style).direction({ x: 1, y: 0 }).y;
  const { x, y, width, height } = shape.bounds;
  const third = height / 3;
  if (tip < 0) return { x, y: y + third, width, height: height - third };
  if (tip > 0) return { x, y, width, height: height - third };
  return shape.bounds;
}

/** Triangle (`triangle`, vers la droite par défaut) : boîte du contour ; flèches sur `trianglePerimeter`. */
export const definition: ShapeDefinition = {
  id: 'triangle',
  ...box(outline, { roundable: true, label }),
  flippable: { horizontal: true, vertical: true },
  rotatable: true,
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
