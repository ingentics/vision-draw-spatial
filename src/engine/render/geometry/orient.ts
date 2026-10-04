import type { Point, Rect } from '../../model/types';

/**
 * Orientation d'une forme draw.io (`direction`, `flipH`, `flipV`), **portée de draw.io** (mxGraph,
 * Apache 2.0 : `mxShape.paint`, `getShapeRotation`, `mxSvgCanvas2D.rotate`).
 *
 * La forme dessine son contour dans un cadre local (`draw(largeur, hauteur)`, origine en haut à gauche).
 * Avec `direction=north|south`, ce cadre a la largeur et la hauteur échangées, centré sur les bornes ; le
 * dessin est ensuite tourné autour du centre (south 90°, west 180°, north 270°, sens horaire à l'écran),
 * puis retourné (`flipH`, `flipV`, échangés pour un cadre couché) comme le fait le canevas de draw.io.
 */
export function orientedPath(
  bounds: Rect,
  style: Record<string, string>,
  draw: (w: number, h: number) => Point[],
): Point[] {
  const direction = style.direction;
  const inverted = direction === 'north' || direction === 'south';
  let { x, y, width: w, height: h } = bounds;
  if (inverted) {
    const shift = (w - h) / 2;
    x += shift;
    y -= shift;
    [w, h] = [h, w];
  }
  const local = draw(w, h).map((p) => ({ x: x + p.x, y: y + p.y }));

  // Cadre couché (north / south) : draw.io échange aussi les deux retournements (mxShape.apply).
  const flipH = (inverted ? style.flipV : style.flipH) === '1';
  const flipV = (inverted ? style.flipH : style.flipV) === '1';
  let theta = direction === 'north' ? 270 : direction === 'west' ? 180 : direction === 'south' ? 90 : 0;
  if (flipH && flipV) theta += 180;
  // Un seul retournement : l'angle change de sens (le miroir est appliqué après la rotation).
  if (flipH !== flipV) theta = -theta;
  const mirror = flipH !== flipV;
  if (theta % 360 === 0 && !mirror) return local;

  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const rad = (theta * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad) * 1e12) / 1e12;
  const sin = Math.round(Math.sin(rad) * 1e12) / 1e12;
  return local.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    let px = cx + dx * cos - dy * sin;
    let py = cy + dx * sin + dy * cos;
    if (mirror && flipH) px = 2 * cx - px;
    if (mirror && flipV) py = 2 * cy - py;
    return { x: px, y: py };
  });
}
