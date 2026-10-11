import { styleNumber, clamp } from '../../../../core/plugins';
import type { Point, Rect, ShapeDefinition, ShapeDetail, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Décalage entre deux couches par défaut (`dx`), en px (premier et dernier à un carré de grille) : fixe, quelle que soit la taille de la forme. */
const DEFAULT_DX = 5;

/** Décalage des couches : `dx` px, au plus le quart du plus petit côté (trois couches doivent tenir). */
function offset({ style, bounds }: ShapeModel): number {
  return clamp(styleNumber(style, 'dx', DEFAULT_DX), 0, Math.min(bounds.width, bounds.height) / 4);
}

/**
 * Escalier des trois couches (sujet 521) : rectangle de devant en bas à gauche, couches derrière décalées de `d` vers
 * la droite et vers le haut.
 */
function outline(shape: ShapeModel): Point[] {
  const { x, y, width: w, height: h } = shape.bounds;
  const d = offset(shape);
  return [
    { x, y: y + 2 * d },
    { x: x + d, y: y + 2 * d },
    { x: x + d, y: y + d },
    { x: x + 2 * d, y: y + d },
    { x: x + 2 * d, y },
    { x: x + w, y },
    { x: x + w, y: y + h - 2 * d },
    { x: x + w - d, y: y + h - 2 * d },
    { x: x + w - d, y: y + h - d },
    { x: x + w - 2 * d, y: y + h - d },
    { x: x + w - 2 * d, y: y + h },
    { x, y: y + h },
  ];
}

/** Bords haut et droit des deux couches de devant, par-dessus le fond. */
function edges(shape: ShapeModel): ShapeDetail[] {
  const { x, y, width: w, height: h } = shape.bounds;
  const d = offset(shape);
  const corner = (i: number) => [
    { x: x + i * d, y: y + (2 - i) * d },
    { x: x + w - (2 - i) * d, y: y + (2 - i) * d },
    { x: x + w - (2 - i) * d, y: y + h - i * d },
  ];
  return [corner(0), corner(1)].map((path) => ({ path, closed: false }));
}

/** Zone du texte : le rectangle de devant. */
function label(shape: ShapeModel): Rect {
  const { x, y, width, height } = shape.bounds;
  const d = offset(shape);
  return { x, y: y + 2 * d, width: width - 2 * d, height: height - 2 * d };
}

/**
 * Rectangles empilés (« Layered Rect » de draw.io, `mxgraph.basic.layered_rect`) : trois rectangles en escalier
 * décalés de `dx` px, texte dans celui de devant. Prisme du contour en iso / 3D, bords des couches sur le dessus.
 */
export const definition: ShapeDefinition = {
  id: 'stacked-rectangles',
  kinds: ['mxgraph.basic.layered_rect'],
  ...box(outline, { details: edges, label }),
  contains: () => true,
  swatch: () => '<path d="M10 5H34V19H32V21H30V23H6V9H8V7H10Z"/><path d="M6 9H30V23M8 7H32V21"/>',
  palette: {
    name: 'Rectangles empilés',
    category: 'geometry',
    order: 25,
    keywords: ['stack', 'pile', 'empilés', 'couches', 'layered', 'multiple', 'documents', 'cartes'],
    style: `shape=mxgraph.basic.layered_rect;dx=${DEFAULT_DX};outlineConnect=0;whiteSpace=wrap;html=1;`,
    value: '',
    width: 120,
    height: 80,
    icon: '<path d="M10 4H36V20H33V23H30V26H4V10H7V7H10Z"/><path d="M4 10H30V26M7 7H33V23"/>',
  },
};
