import { orientedPath, styleNumber } from '../../../../core/plugins';
import type { ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Profondeur par défaut de draw.io : 20 px avec `fixedSize=1`, sinon le cinquième de la largeur. */
const FIXED_SIZE = 20;
const RELATIVE_SIZE = 0.2;

/**
 * Étape de draw.io (`StepShape.redrawPath`) : chevron, encoche à gauche et pointe à droite de profondeur `size` (px
 * avec `fixedSize=1`, au plus la largeur ; sinon fraction de la largeur), orienté comme draw.io.
 */
function outline(shape: ShapeModel) {
  const fixed = (shape.style.fixedSize ?? '0') !== '0';
  const size = styleNumber(shape.style, 'size', fixed ? FIXED_SIZE : RELATIVE_SIZE);
  return orientedPath(shape.bounds, shape.style, (w, h) => {
    const s = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
    return [
      { x: 0, y: 0 },
      { x: w - s, y: 0 },
      { x: w, y: h / 2 },
      { x: w - s, y: h },
      { x: 0, y: h },
      { x: s, y: h / 2 },
    ];
  });
}

/** Étape (`shape=step`) : boîte du contour ; flèches sur `stepPerimeter`. */
export const definition: ShapeDefinition = {
  id: 'step',
  ...box(outline, { roundable: true }),
  swatch: () => '<path d="M6 5h22l6 9l-6 9H6l6-9z"/>',
  palette: {
    name: 'Étape',
    category: 'geometry',
    order: 170,
    keywords: ['step', 'étape', 'chevron', 'processus', 'process'],
    style: 'shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;',
    value: '',
    width: 120,
    height: 80,
    icon: '<path d="M3 4h27l7 10l-7 10H3l7-10z"/>',
  },
};
