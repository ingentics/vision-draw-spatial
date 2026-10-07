import type { Point, ShapeModel } from '../../../../core/model/types';
import { orientedPath } from '../../../../core/render/geometry/orient';
import { box } from '../../generic/box';
import type { ShapeDefinition } from '../../../../core/shapes/types';

/** Cadre du stencil `Pentagon` de draw.io (`stencils/basic.xml`, `w` et `h` de `<shape>`). */
const STENCIL_W = 97;
const STENCIL_H = 90;

/** Contour du stencil, pointe en haut, coordonnées du stencil. */
const PENTAGON_PATH: Point[] = [
  { x: 18.5, y: 90 },
  { x: 0, y: 33 },
  { x: 48.5, y: 0 },
  { x: 97, y: 33 },
  { x: 78.5, y: 90 },
];

/** Contour étiré dans les bornes (`aspect="variable"`), orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) =>
    PENTAGON_PATH.map((p) => ({ x: (p.x * w) / STENCIL_W, y: (p.y * h) / STENCIL_H })),
  );
}

/** Pentagone (stencil `mxgraph.basic.pentagon`) : boîte du contour ; flèches sur les bornes, comme draw.io. */
export const definition: ShapeDefinition = {
  id: 'pentagon',
  kinds: ['mxgraph.basic.pentagon'],
  ...box(outline),
  swatch: () => '<path d="M20 4l13 9l-5 11H12L7 13z"/>',
  palette: {
    name: 'Pentagone',
    category: 'geometry',
    order: 130,
    keywords: ['pentagon', 'pentagone', 'cinq côtés'],
    style: 'whiteSpace=wrap;html=1;shape=mxgraph.basic.pentagon',
    value: '',
    width: 100,
    height: 90,
    icon: '<path d="M20 2l15 10l-6 14H11L5 12z"/>',
  },
};
