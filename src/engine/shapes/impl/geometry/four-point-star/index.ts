import type { ShapeModel } from '../../../../model/types';
import { orientedPath } from '../../../../render/geometry/orient';
import { styleNumber } from '../../../../model/styleValues';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** `dx` par défaut de draw.io (creux des branches, fraction de la demi-forme). */
const DEFAULT_DX = 0.8;

/**
 * Étoile à 4 branches de draw.io (`mxShapeBasic4PointStar2`) : pointes au milieu des côtés, creux à `dx / 2` des
 * bornes (en fraction de la largeur et de la hauteur), orientée comme draw.io.
 */
function outline(shape: ShapeModel) {
  const dx = styleNumber(shape.style, 'dx', DEFAULT_DX);
  return orientedPath(shape.bounds, shape.style, (w, h) => {
    const d = 0.5 * Math.max(0, Math.min(w, dx));
    return [
      { x: 0, y: h / 2 },
      { x: d * w, y: d * h },
      { x: w / 2, y: 0 },
      { x: w - d * w, y: d * h },
      { x: w, y: h / 2 },
      { x: w - d * w, y: h - d * h },
      { x: w / 2, y: h },
      { x: d * w, y: h - d * h },
    ];
  });
}

/** Étoile à 4 branches (`mxgraph.basic.4_point_star_2`) : boîte du contour ; flèches sur les bornes. */
export const definition: ShapeDefinition = {
  id: 'four-point-star',
  kinds: ['mxgraph.basic.4_point_star_2'],
  ...box(outline),
  swatch: () => '<path d="M20 3l3 8l9 3l-9 3l-3 8l-3-8l-9-3l9-3z"/>',
  palette: {
    name: 'Étoile à 4 branches',
    category: 'geometry',
    order: 180,
    keywords: ['star', 'étoile', '4', 'quatre', 'branches', 'scintillement'],
    // Palette « Basic » de draw.io : label sous la forme.
    style: 'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.4_point_star_2;dx=0.8;',
    value: '',
    width: 100,
    height: 100,
    icon: '<path d="M20 1l3 10l11 3l-11 3l-3 10l-3-10l-11-3l11-3z"/>',
  },
};
