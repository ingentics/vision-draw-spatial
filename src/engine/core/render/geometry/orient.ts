import type { Point, Rect } from '../../model/types';
import { styleFlag } from '../../model/styleValues';

/**
 * Orientation d'une forme draw.io (`direction`, `flipH`, `flipV`), **portée de draw.io** (mxGraph,
 * Apache 2.0 : `mxShape.paint`, `getShapeRotation`, `mxSvgCanvas2D.rotate`).
 *
 * La forme dessine son contour dans un cadre local (`draw(largeur, hauteur)`, origine en haut à gauche).
 * Avec `direction=north|south`, ce cadre a la largeur et la hauteur échangées, centré sur les bornes ; le
 * dessin est ensuite tourné autour du centre (south 90°, west 180°, north 270°, sens horaire à l'écran),
 * puis retourné (`flipH`, `flipV`, échangés pour un cadre couché) comme le fait le canevas de draw.io.
 */

/** Orientation d'une forme dans ses bornes : cadre local, et passage d'un point ou d'une direction de ce cadre à la page. */
export interface Orientation {
  /** Taille du cadre local (largeur et hauteur échangées avec `direction=north|south`). */
  width: number;
  height: number;
  /** Point du cadre local (origine en haut à gauche) vers la page. */
  map(point: Point): Point;
  /** Direction du cadre local vers la page (rotation et retournement, sans translation). */
  direction(vector: Point): Point;
}

/** Orientation de la forme de bornes `bounds` et de style `style` (sujet 307 : commune à `orientedPath` et aux formes). */
export function orientation(bounds: Rect, style: Record<string, string>): Orientation {
  const direction = style.direction;
  const inverted = direction === 'north' || direction === 'south';
  let { x, y, width: w, height: h } = bounds;
  if (inverted) {
    const shift = (w - h) / 2;
    x += shift;
    y -= shift;
    [w, h] = [h, w];
  }

  // Cadre couché (north / south) : draw.io échange aussi les deux retournements (mxShape.apply).
  const flipH = styleFlag(style, inverted ? 'flipV' : 'flipH');
  const flipV = styleFlag(style, inverted ? 'flipH' : 'flipV');
  let theta = direction === 'north' ? 270 : direction === 'west' ? 180 : direction === 'south' ? 90 : 0;
  if (flipH && flipV) theta += 180;
  // Un seul retournement : l'angle change de sens (le miroir est appliqué après la rotation).
  if (flipH !== flipV) theta = -theta;
  const mirror = flipH !== flipV;
  const rad = (theta * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad) * 1e12) / 1e12;
  const sin = Math.round(Math.sin(rad) * 1e12) / 1e12;
  const turn = (v: Point): Point => {
    let dx = v.x * cos - v.y * sin;
    let dy = v.x * sin + v.y * cos;
    if (mirror && flipH) dx = -dx;
    if (mirror && flipV) dy = -dy;
    return { x: dx, y: dy };
  };
  const identity = theta % 360 === 0 && !mirror;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    width: w,
    height: h,
    map: (p) => {
      const local = { x: x + p.x, y: y + p.y };
      if (identity) return local;
      const v = turn({ x: local.x - cx, y: local.y - cy });
      return { x: cx + v.x, y: cy + v.y };
    },
    direction: (v) => (identity ? { ...v } : turn(v)),
  };
}

/**
 * Contour orienté : dessiné par `draw(largeur, hauteur)` dans le cadre local de la forme, puis placé dans ses bornes
 * (`orientation`).
 */
export function orientedPath(
  bounds: Rect,
  style: Record<string, string>,
  draw: (w: number, h: number) => Point[],
): Point[] {
  const oriented = orientation(bounds, style);
  return draw(oriented.width, oriented.height).map(oriented.map);
}
