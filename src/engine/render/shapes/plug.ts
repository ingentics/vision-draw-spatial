import { stencilShape } from '../../format/stencil';
import type { Point, ShapeModel } from '../../model/types';
import { flatBox } from '../flat/box';
import { orientedPath } from '../geometry/orient';
import { isoBlock } from '../iso/block';
import type { ShapeDefinition } from './types';

/** Cadre du stencil (`w`, `h` de `<shape>`) : le contour s'étire dans les bornes de la forme. */
const STENCIL_W = 100;
const STENCIL_H = 60;

/** Prise : corps sur les 7/10 de la largeur, deux broches à droite. Un seul contour fermé, coordonnées du stencil. */
const PLUG_PATH: Point[] = [
  { x: 0, y: 0 },
  { x: 70, y: 0 },
  { x: 70, y: 12 },
  { x: 100, y: 12 },
  { x: 100, y: 24 },
  { x: 70, y: 24 },
  { x: 70, y: 36 },
  { x: 100, y: 36 },
  { x: 100, y: 48 },
  { x: 70, y: 48 },
  { x: 70, y: 60 },
  { x: 0, y: 60 },
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
export const plugShape: ShapeDefinition = {
  kind: 'stencil:plug',
  outline,
  flat: flatBox(outline),
  iso: isoBlock(outline),
};
