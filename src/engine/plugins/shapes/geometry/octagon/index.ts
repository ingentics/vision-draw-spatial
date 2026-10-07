import type { ShapeModel } from '../../../../core/model/types';
import { orientedPath } from '../../../../core/render/geometry/orient';
import { styleNumber } from '../../../../core/model/styleValues';
import { box } from '../../generic/box';
import type { ShapeDefinition } from '../../../../core/shapes/types';

/** `dx` par défaut de draw.io sans valeur dans le style (la palette écrit `dx=15`). */
const DEFAULT_DX = 0.5;

/**
 * Octogone de draw.io (`mxShapeBasicOctagon`) : les bornes aux quatre coins coupés de 2 × `dx`, au plus la moitié
 * du petit côté, orienté comme draw.io.
 */
function outline(shape: ShapeModel) {
  const dx = styleNumber(shape.style, 'dx', DEFAULT_DX);
  return orientedPath(shape.bounds, shape.style, (w, h) => {
    const c = Math.min(w / 2, h / 2, 2 * Math.max(0, Math.min(w, dx)));
    return [
      { x: c, y: 0 },
      { x: w - c, y: 0 },
      { x: w, y: c },
      { x: w, y: h - c },
      { x: w - c, y: h },
      { x: c, y: h },
      { x: 0, y: h - c },
      { x: 0, y: c },
    ];
  });
}

/** Octogone (`mxgraph.basic.octagon2`) : boîte du contour ; flèches sur les bornes (pas de périmètre propre). */
export const definition: ShapeDefinition = {
  id: 'octagon',
  kinds: ['mxgraph.basic.octagon2'],
  ...box(outline),
  swatch: () => '<path d="M15 4h10l7 7v6l-7 7H15l-7-7v-6z"/>',
  palette: {
    name: 'Octogone',
    category: 'geometry',
    order: 120,
    keywords: ['octagon', 'octogone', 'huit côtés', 'stop'],
    style: 'whiteSpace=wrap;html=1;shape=mxgraph.basic.octagon2;align=center;verticalAlign=middle;dx=15;',
    value: '',
    width: 100,
    height: 100,
    icon: '<path d="M15 2h10l7 7v10l-7 7H15l-7-7V9z"/>',
  },
};
