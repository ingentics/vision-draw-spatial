import { orientedPath, quadTo } from '../../../../core/plugins';
import type { Point, Rect, ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';
import { stencilBox } from '../../generic/stencil';

/** Hauteurs fixes (px) du haut bombé et de la pointe : seuls les flancs droits s'allongent au redimensionnement. */
const DOME = 10;
const POINT = 50;
/** Cadre du stencil exporté (`w`, `h` de `<shape>`), à la taille posée. */
const STENCIL_W = 80;
const STENCIL_H = 100;

/** Hauteurs du haut bombé et de la pointe, réduites ensemble si la forme est moins haute que les deux. */
function heights(h: number): { dome: number; point: number } {
  const k = Math.min(1, h / (DOME + POINT));
  return { dome: DOME * k, point: POINT * k };
}

/**
 * Bouclier « sécurité » (sujet 522), cadre local `w` × `h` : haut bombé vers le sommet central, flancs droits, puis
 * deux courbes jusqu'à la pointe en bas. Courbes de Bézier quadratiques échantillonnées : un seul contour fermé,
 * symétrique.
 */
function shieldPath(w: number, h: number): Point[] {
  const { dome, point } = heights(h);
  const side = h - point;
  const corner = { x: 0, y: dome };
  const top = { x: w / 2, y: 0 };
  const right = { x: w, y: dome };
  const sideRight = { x: w, y: side };
  const tip = { x: w / 2, y: h };
  const sideLeft = { x: 0, y: side };
  const bend = side + (point * 2) / 3;
  return [
    corner,
    ...quadTo(corner, { x: w * 0.3, y: dome }, top, 8),
    ...quadTo(top, { x: w * 0.7, y: dome }, right, 8),
    sideRight,
    ...quadTo(sideRight, { x: w, y: bend }, tip, 12),
    // Dernier point (le coin de départ) omis : le contour est fermé.
    ...quadTo(tip, { x: 0, y: bend }, sideLeft, 12),
  ];
}

function outline(shape: ShapeModel): Point[] {
  return orientedPath(shape.bounds, shape.style, shieldPath);
}

/** Zone du texte : la partie haute, entre les flancs droits, au-dessus de la pointe. */
function label({ bounds: { x, y, width, height } }: ShapeModel): Rect {
  const { dome, point } = heights(height);
  return { x, y: y + dome, width, height: height - dome - (point * 3) / 4 };
}

/**
 * Stencil exporté : le contour à la taille posée. draw.io l'étire en entier (haut et pointe compris), l'appli garde
 * le haut et la pointe fixes (export seul, sujet 408).
 */
const SHIELD_SHAPE = stencilBox({
  name: 'shield',
  width: STENCIL_W,
  height: STENCIL_H,
  outline: shieldPath(STENCIL_W, STENCIL_H),
}).shape;

/**
 * Bouclier : pas de forme native dans draw.io, c'est un stencil embarqué dans le style (`shape=stencil(…)`, nom
 * `shield`). Haut bombé et pointe de hauteur fixe ; prisme du contour en iso / 3D ; texte dans la partie haute.
 */
export const definition: ShapeDefinition = {
  id: 'shield',
  kinds: ['stencil:shield'],
  ...box(outline, { label }),
  swatch: () => '<path d="M12 6Q16 6 20 3Q24 6 28 6V14Q28 21 20 25Q12 21 12 14Z"/>',
  palette: {
    name: 'Bouclier',
    category: 'geometry',
    order: 200,
    keywords: ['shield', 'bouclier', 'écusson', 'sécurité', 'security', 'protection', 'blason'],
    style: `shape=${SHIELD_SHAPE};whiteSpace=wrap;html=1;`,
    value: '',
    width: STENCIL_W,
    height: STENCIL_H,
    icon: '<path d="M8 6Q14 6 20 2Q26 6 32 6V15Q32 23 20 27Q8 23 8 15Z"/>',
  },
};
