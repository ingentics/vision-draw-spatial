import { Color, Group } from 'three';
import { fillMesh, PART_ORDER, roundedRectPath, styleColor, styleOpacity } from '../../../../../core/plugins';
import type { Point, Rect, ShapeModel } from '../../../../../core/plugins';

/**
 * Papier d'un post-it typé (sujet 482) : carré aux coins arrondis, sans contour, et une ombre douce dessous qui ne
 * déborde pas sur les côtés. Les post-it se collent bord à bord : une ombre plus large que le papier passerait sous
 * le voisin, et les deux ombres s'additionneraient en une tache sombre sous la jointure.
 */

export const PAPER_RADIUS = 8;

/** Ombre : décalée vers le bas, floue, noire à 20 % au plus foncé. */
const SHADOW_OFFSET = 3;
const SHADOW_BLUR = 8;
const SHADOW_OPACITY = 0.2;
/** Couches du flou : rectangles de plus en plus étendus, dont les opacités s'additionnent vers le centre. */
const SHADOW_LAYERS = 12;

export const paperOutline = (shape: ShapeModel): Point[] => roundedRectPath(shape.bounds, PAPER_RADIUS);

/**
 * Couche de l'ombre étendue de `spread` (0 à `SHADOW_BLUR`) : le cœur est rentré du flou à gauche, à droite et en haut,
 * si bien que la couche la plus large reste dans la largeur du papier ; seul le bas dépasse, du décalage et du flou.
 */
function shadowRect({ x, y, width, height }: Rect, spread: number): Rect {
  const inset = SHADOW_BLUR - spread;
  return {
    x: x + inset,
    y: y + SHADOW_OFFSET + inset,
    width: Math.max(width - 2 * inset, 0),
    height: Math.max(height - inset + spread, 0),
  };
}

function shadow(bounds: Rect): Group {
  const group = new Group();
  group.name = 'shadow';
  const layer = 1 - Math.pow(1 - SHADOW_OPACITY, 1 / SHADOW_LAYERS);
  for (let i = 0; i < SHADOW_LAYERS; i++) {
    const spread = (SHADOW_BLUR * (i + 0.5)) / SHADOW_LAYERS;
    const mesh = fillMesh(roundedRectPath(shadowRect(bounds, spread), PAPER_RADIUS), new Color('#000000'), layer);
    mesh.name = 'shadow';
    // Sous le papier : dessinée juste avant son fond (comme le Post-it, sujet 411).
    mesh.renderOrder = PART_ORDER.fill - 1;
    group.add(mesh);
  }
  return group;
}

/** Papier de la couleur du style (`fallback` : celle du type), jamais de contour. */
export function stickyPaper(shape: ShapeModel, fallback: string): Group {
  const group = new Group();
  group.add(shadow(shape.bounds));
  const fill = styleColor(shape.style, 'fillColor', fallback);
  if (fill) group.add(fillMesh(paperOutline(shape), fill, styleOpacity(shape.style, 'fillOpacity')));
  return group;
}
