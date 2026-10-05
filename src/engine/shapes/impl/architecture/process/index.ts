import type { Point, Rect, ShapeModel } from '../../../../model/types';
import { orientedPath } from '../../../../render/geometry/orient';
import { cornerRadius, rectPath, roundedRectPath } from '../../../../render/geometry/paths';
import { styleNumber } from '../../../../render/styleValues';
import { box } from '../../../generic/box';
import type { ShapeDefinition } from '../../../types';

/** Écart des barres par défaut (`ProcessShape.prototype.size`), en fraction de la largeur. */
const DEFAULT_SIZE = 0.1;
/** `arcSize` par défaut d'un rectangle arrondi (`RECTANGLE_ROUNDING_FACTOR`), en %. */
const DEFAULT_ARC_SIZE = 15;

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
const arcFraction = (style: Record<string, string>) => styleNumber(style, 'arcSize', DEFAULT_ARC_SIZE) / 100;

/**
 * Écart des barres aux bords, dans le cadre local `w` × `h`, comme `ProcessShape.paintForeground` de draw.io :
 * `size` px avec `fixedSize=1` (au plus la largeur), sinon fraction de la largeur ; arrondi, au moins le coin.
 */
function barInset(style: Record<string, string>, w: number, h: number): number {
  const size = styleNumber(style, 'size', DEFAULT_SIZE);
  let inset = style.fixedSize === '1' ? clamp(size, w) : w * clamp(size, 1);
  if (style.rounded === '1') inset = Math.max(inset, Math.min(w * arcFraction(style), h * arcFraction(style)));
  return Math.round(inset);
}

function outline(shape: ShapeModel): Point[] {
  return shape.style.rounded === '1'
    ? roundedRectPath(shape.bounds, cornerRadius(shape.style, shape.bounds))
    : rectPath(shape.bounds);
}

/** Les deux barres, sur toute la hauteur du cadre local, orientées comme la forme (`direction`). */
function bars(shape: ShapeModel) {
  const at = (side: 0 | 1) =>
    orientedPath(shape.bounds, shape.style, (w, h) => {
      const x = side === 0 ? barInset(shape.style, w, h) : w - barInset(shape.style, w, h);
      return [
        { x, y: 0 },
        { x, y: h },
      ];
    });
  return [at(0), at(1)].map((path) => ({ path, closed: false }));
}

/**
 * Zone du texte, comme `ProcessShape.getLabelBounds` : entre les barres quand le texte suit la forme (`horizontal`
 * et forme couchée), l'écart pris en fraction de la largeur même avec `fixedSize` (comme draw.io).
 */
function label(shape: ShapeModel): Rect {
  const { bounds, style } = shape;
  const lying = !style.direction || style.direction === 'east' || style.direction === 'west';
  if ((style.horizontal !== '0') !== lying) return bounds;
  let inset = bounds.width * clamp(styleNumber(style, 'size', DEFAULT_SIZE), 1);
  if (style.rounded === '1')
    inset = Math.max(inset, Math.min(bounds.width * arcFraction(style), bounds.height * arcFraction(style)));
  inset = Math.round(inset);
  return { ...bounds, x: bounds.x + inset, width: Math.max(0, bounds.width - 2 * inset) };
}

/**
 * Process (`shape=process`, le « Process » de draw.io) : rectangle (arrondi si `rounded=1`) et deux barres
 * verticales, texte entre les barres. Prisme du contour en iso / 3D, barres sur le dessus.
 */
export const definition: ShapeDefinition = {
  id: 'process',
  ...box(outline, { details: bars, label }),
  contains: () => true,
  properties: [{ type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' }],
  swatch: () => '<path d="M6 5h28v18H6zM10 5v18M30 5v18"/>',
  palette: {
    name: 'Process',
    category: 'architecture',
    order: 82,
    keywords: ['process', 'processus', 'service', 'traitement', 'job'],
    style: 'shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<path d="M4 6h32v16H4zM8 6v16M32 6v16"/>',
  },
};
