import { Group } from 'three';
import { fillMesh, roundedRectPath, softShadow, styleColor, styleOpacity } from '../../../../../core/plugins';
import type { Point, Rect, ShapeModel, SoftShadow } from '../../../../../core/plugins';

/**
 * Papier d'un post-it typé (sujet 482) : carré aux coins arrondis, sans contour, et une ombre douce dessous qui ne
 * déborde pas sur les côtés. Les post-it se collent bord à bord : une ombre plus large que le papier passerait sous
 * le voisin, et les deux ombres s'additionneraient en une tache sombre sous la jointure.
 */

export const PAPER_RADIUS = 8;

/** Ombre : décalée vers le bas, floue, noire à 20 % au plus foncé, en 12 couches. */
const SHADOW_OFFSET = 3;
const SHADOW: SoftShadow = { blur: 8, opacity: 0.2, layers: 12 };

export const paperOutline = (shape: ShapeModel): Point[] => roundedRectPath(shape.bounds, PAPER_RADIUS);

/**
 * Couche de l'ombre étendue de `spread` (0 à `SHADOW.blur`) : le cœur est rentré du flou à gauche, à droite et en haut,
 * si bien que la couche la plus large reste dans la largeur du papier ; seul le bas dépasse, du décalage et du flou.
 */
function shadowRect({ x, y, width, height }: Rect, spread: number): Rect {
  const inset = SHADOW.blur - spread;
  return {
    x: x + inset,
    y: y + SHADOW_OFFSET + inset,
    width: Math.max(width - 2 * inset, 0),
    height: Math.max(height - inset + spread, 0),
  };
}

/** Papier de la couleur du style (`fallback` : celle du type), jamais de contour. */
export function stickyPaper(shape: ShapeModel, fallback: string): Group {
  const group = new Group();
  group.add(softShadow((spread) => roundedRectPath(shadowRect(shape.bounds, spread), PAPER_RADIUS), SHADOW));
  const fill = styleColor(shape.style, 'fillColor', fallback);
  if (fill) group.add(fillMesh(paperOutline(shape), fill, styleOpacity(shape.style, 'fillOpacity')));
  return group;
}
