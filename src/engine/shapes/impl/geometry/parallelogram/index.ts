import type { ShapeModel } from '../../../../core/model/types';
import { orientedPath } from '../../../../core/render/geometry/orient';
import { styleNumber } from '../../../../core/model/styleValues';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Décalage par défaut de draw.io : 20 px avec `fixedSize=1`, sinon le cinquième de la largeur. */
const FIXED_SIZE = 20;
const RELATIVE_SIZE = 0.2;

/**
 * Parallélogramme de draw.io (`ParallelogramShape.redrawPath`) : côtés obliques décalés de `size` (px avec
 * `fixedSize=1`, au plus la largeur ; sinon fraction de la largeur), penchés vers la droite, orienté comme draw.io.
 */
function outline(shape: ShapeModel) {
  const fixed = (shape.style.fixedSize ?? '0') !== '0';
  const size = styleNumber(shape.style, 'size', fixed ? FIXED_SIZE : RELATIVE_SIZE);
  return orientedPath(shape.bounds, shape.style, (w, h) => {
    const s = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
    return [
      { x: 0, y: h },
      { x: s, y: 0 },
      { x: w, y: 0 },
      { x: w - s, y: h },
    ];
  });
}

/** Parallélogramme (`shape=parallelogram`) : boîte du contour ; flèches sur `parallelogramPerimeter`. */
export const definition: ShapeDefinition = {
  id: 'parallelogram',
  ...box(outline, { roundable: true }),
  swatch: () => '<path d="M6 23l8-18h20l-8 18z"/>',
  palette: {
    name: 'Parallélogramme',
    category: 'geometry',
    order: 160,
    keywords: ['parallelogram', 'parallélogramme', 'entrée', 'sortie', 'input', 'output'],
    style: 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<path d="M3 24l9-20h25l-9 20z"/>',
  },
};
