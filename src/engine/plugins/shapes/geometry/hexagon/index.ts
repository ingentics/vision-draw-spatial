import { orientedPath, styleNumber } from '../../../../core/plugins';
import type { ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Pans coupés par défaut de draw.io : 20 px avec `fixedSize=1`, sinon le quart de la largeur. */
const FIXED_SIZE = 20;
const RELATIVE_SIZE = 0.25;

/**
 * Hexagone couché de draw.io (`HexagonShape.redrawPath`), pointes à gauche et à droite du cadre local, pans de
 * `size` (px avec `fixedSize=1`, au plus la moitié de la largeur ; sinon fraction de la largeur), orienté comme
 * draw.io.
 */
function outline(shape: ShapeModel) {
  const fixed = (shape.style.fixedSize ?? '0') !== '0';
  const size = styleNumber(shape.style, 'size', fixed ? FIXED_SIZE : RELATIVE_SIZE);
  return orientedPath(shape.bounds, shape.style, (w, h) => {
    const s = fixed ? Math.max(0, Math.min(w / 2, size)) : w * Math.max(0, Math.min(1, size));
    return [
      { x: s, y: 0 },
      { x: w - s, y: 0 },
      { x: w, y: h / 2 },
      { x: w - s, y: h },
      { x: s, y: h },
      { x: 0, y: h / 2 },
    ];
  });
}

/** Hexagone (`shape=hexagon`) : boîte du contour. */
export const definition: ShapeDefinition = {
  id: 'hexagon',
  ...box(outline, { roundable: true }),
  swatch: () => '<path d="M12 5h16l6 9l-6 9H12l-6-9z"/>',
  palette: {
    name: 'Hexagone',
    category: 'geometry',
    order: 110,
    keywords: ['hexagon', 'hexagone', 'six côtés'],
    style: 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;',
    value: '',
    width: 120,
    height: 80,
    icon: '<path d="M11 4h18l7 10l-7 10H11L4 14z"/>',
  },
};
