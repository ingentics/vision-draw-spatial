import type { Point, ShapeModel } from '../../../../model/types';
import { orientedPath } from '../../../../render/geometry/orient';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Cadre du stencil `6 Point Star` de draw.io (`stencils/basic.xml`, `w` et `h` de `<shape>`). */
const STENCIL_W = 96;
const STENCIL_H = 84.5;

/** Contour du stencil, pointes à gauche et à droite, coordonnées du stencil. */
const STAR_PATH: Point[] = [
  { x: 23, y: 28.9 },
  { x: 23, y: 0 },
  { x: 48, y: 14.4 },
  { x: 73, y: 0 },
  { x: 73, y: 28.9 },
  { x: 96, y: 42.2 },
  { x: 73, y: 55.6 },
  { x: 73, y: 84.5 },
  { x: 48, y: 70 },
  { x: 23, y: 84.5 },
  { x: 23, y: 55.6 },
  { x: 0, y: 42.2 },
];

/** Contour étiré dans les bornes (`aspect="variable"`), orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) =>
    STAR_PATH.map((p) => ({ x: (p.x * w) / STENCIL_W, y: (p.y * h) / STENCIL_H })),
  );
}

/** Étoile à 6 branches (stencil `mxgraph.basic.6_point_star`) : boîte du contour ; flèches sur les bornes. */
export const definition: ShapeDefinition = {
  id: 'six-point-star',
  kinds: ['mxgraph.basic.6_point_star'],
  ...box(outline),
  swatch: () => '<path d="M14 9V4l6 3l6-3v5l6 5l-6 5v5l-6-3l-6 3v-5l-6-5z"/>',
  palette: {
    name: 'Étoile à 6 branches',
    category: 'geometry',
    order: 190,
    keywords: ['star', 'étoile', '6', 'six', 'branches', 'david'],
    // Palette « Basic » de draw.io : label sous la forme.
    style: 'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.6_point_star',
    value: '',
    width: 100,
    height: 90,
    icon: '<path d="M13 10V2l7 4l7-4v8l7 4l-7 4v8l-7-4l-7 4v-8l-7-4z"/>',
  },
};
