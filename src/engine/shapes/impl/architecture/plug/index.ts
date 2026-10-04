import { stencilShape } from '../../../../format/stencil';
import type { Point, ShapeModel } from '../../../../model/types';
import { orientedPath } from '../../../../render/geometry/orient';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Cadre du stencil (`w`, `h` de `<shape>`) : le contour s'étire dans les bornes de la forme. */
const STENCIL_W = 120;
const STENCIL_H = 100;

/**
 * Prise : fiche électrique vue de face, deux broches en haut, corps rectangulaire, bas en trapèze. Un seul contour
 * fermé, symétrique, coordonnées du stencil.
 */
const PLUG_PATH: Point[] = [
  { x: 0, y: 25 },
  { x: 27, y: 25 },
  { x: 27, y: 0 },
  { x: 47, y: 0 },
  { x: 47, y: 25 },
  { x: 73, y: 25 },
  { x: 73, y: 0 },
  { x: 93, y: 0 },
  { x: 93, y: 25 },
  { x: 120, y: 25 },
  { x: 120, y: 77 },
  { x: 83, y: 100 },
  { x: 37, y: 100 },
  { x: 0, y: 77 },
];

/** XML du stencil draw.io, tiré du même contour : draw.io dessine la prise à l'identique. */
const PLUG_STENCIL =
  `<shape name="plug" w="${STENCIL_W}" h="${STENCIL_H}" aspect="variable" strokewidth="inherit">` +
  '<background><path>' +
  PLUG_PATH.map((p, i) => `<${i === 0 ? 'move' : 'line'} x="${p.x}" y="${p.y}"/>`).join('') +
  '<close/></path></background><foreground><fillstroke/></foreground></shape>';

/** Valeur de `shape=` de la prise (stencil embarqué, compressé comme draw.io). */
export const PLUG_SHAPE = stencilShape(PLUG_STENCIL);

/** Contour étiré dans les bornes (`aspect="variable"`), orienté comme draw.io (`mxStencil.computeAspect`). */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) =>
    PLUG_PATH.map((p) => ({ x: (p.x * w) / STENCIL_W, y: (p.y * h) / STENCIL_H })),
  );
}

/**
 * Prise (connecteur, module qui se branche) : pas de forme native dans draw.io, c'est un stencil embarqué dans le
 * style (`shape=stencil(…)`, nom `plug`). Prisme du contour en iso / 3D ; périmètre rectangle, comme draw.io.
 */
export const definition: ShapeDefinition = {
  id: 'plug',
  kinds: ['stencil:plug'],
  ...box(outline),
  palette: {
    name: 'Prise',
    category: 'architecture',
    order: 80,
    keywords: ['plug', 'plugin', 'connecteur', 'connector', 'module', 'extension'],
    // Pas de prise native dans draw.io : stencil embarqué, dessiné à l'identique par draw.io.
    style: `shape=${PLUG_SHAPE};whiteSpace=wrap;html=1;`,
    value: '',
    width: 96,
    height: 80,
    icon: '<path d="M4 11h5V6h4v5h6V6h4v5h5v10l-7 5H11l-7-5z"/>',
  },
};
