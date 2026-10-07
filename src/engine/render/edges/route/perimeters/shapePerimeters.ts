import type { Point, Rect } from '../../../../model/types';
import { intersection } from '../util';

/** Périmètres calculés (`mxPerimeter`) : rectangle, losange, triangle, ellipse. */

export function rectanglePerimeter(bounds: Rect, next: Point, orthogonal: boolean): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const alpha = Math.atan2(next.y - cy, next.x - cx);
  const p = { x: 0, y: 0 };
  const beta = Math.PI / 2 - alpha;
  const t = Math.atan2(bounds.height, bounds.width);
  if (alpha < -Math.PI + t || alpha > Math.PI - t) {
    p.x = bounds.x;
    p.y = cy - (bounds.width * Math.tan(alpha)) / 2;
  } else if (alpha < -t) {
    p.y = bounds.y;
    p.x = cx - (bounds.height * Math.tan(beta)) / 2;
  } else if (alpha < t) {
    p.x = bounds.x + bounds.width;
    p.y = cy + (bounds.width * Math.tan(alpha)) / 2;
  } else {
    p.y = bounds.y + bounds.height;
    p.x = cx + (bounds.height * Math.tan(beta)) / 2;
  }
  if (orthogonal) {
    if (next.x >= bounds.x && next.x <= bounds.x + bounds.width) p.x = next.x;
    else if (next.y >= bounds.y && next.y <= bounds.y + bounds.height) p.y = next.y;
    if (next.x < bounds.x) p.x = bounds.x;
    else if (next.x > bounds.x + bounds.width) p.x = bounds.x + bounds.width;
    if (next.y < bounds.y) p.y = bounds.y;
    else if (next.y > bounds.y + bounds.height) p.y = bounds.y + bounds.height;
  }
  return p;
}

export function rhombusPerimeter(bounds: Rect, next: Point, orthogonal: boolean): Point {
  const { x, y, width: w, height: h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const px = next.x;
  const py = next.y;
  // Dans l'axe d'un sommet : le sommet.
  if (cx === px) return cy > py ? { x: cx, y } : { x: cx, y: y + h };
  if (cy === py) return cx > px ? { x, y: cy } : { x: x + w, y: cy };
  let tx = cx;
  let ty = cy;
  if (orthogonal) {
    if (px >= x && px <= x + w) tx = px;
    else if (py >= y && py <= y + h) ty = py;
  }
  // Côté du losange selon le quadrant.
  const hit =
    px < cx
      ? py < cy
        ? intersection(px, py, tx, ty, cx, y, x, cy)
        : intersection(px, py, tx, ty, cx, y + h, x, cy)
      : py < cy
        ? intersection(px, py, tx, ty, cx, y, x + w, cy)
        : intersection(px, py, tx, ty, cx, y + h, x + w, cy);
  // draw.io renvoie alors `null` (bout au centre de la forme, via getPoint) : même repli.
  return hit ?? { x: cx, y: cy };
}

/** `mxPerimeter.TrianglePerimeter` : triangle pointe à droite, tourné selon `direction`. */
export function trianglePerimeter(bounds: Rect, next: Point, orthogonal: boolean, direction?: string): Point {
  const vertical = direction === 'north' || direction === 'south';
  const { x, y, width: w, height: h } = bounds;
  let cx = x + w / 2;
  let cy = y + h / 2;
  // Base : de `start` à `end` ; pointe : `corner`.
  let start = { x, y };
  let corner = { x: x + w, y: cy };
  let end = { x, y: y + h };
  if (direction === 'north') {
    start = end;
    corner = { x: cx, y };
    end = { x: x + w, y: y + h };
  } else if (direction === 'south') {
    corner = { x: cx, y: y + h };
    end = { x: x + w, y };
  } else if (direction === 'west') {
    start = { x: x + w, y };
    corner = { x, y: cy };
    end = { x: x + w, y: y + h };
  }
  const dx = next.x - cx;
  const dy = next.y - cy;
  const alpha = vertical ? Math.atan2(dx, dy) : Math.atan2(dy, dx);
  const t = vertical ? Math.atan2(w, h) : Math.atan2(h, w);
  const towardBase =
    direction === 'north' || direction === 'west'
      ? alpha > -t && alpha < t
      : alpha < -Math.PI + t || alpha > Math.PI - t;
  let hit: Point | undefined;
  if (towardBase) {
    if (
      orthogonal &&
      ((vertical && next.x >= start.x && next.x <= end.x) || (!vertical && next.y >= start.y && next.y <= end.y))
    )
      hit = vertical ? { x: next.x, y: start.y } : { x: start.x, y: next.y };
    else if (direction === 'north') hit = { x: x + w / 2 + (h * Math.tan(alpha)) / 2, y: y + h };
    else if (direction === 'south') hit = { x: x + w / 2 - (h * Math.tan(alpha)) / 2, y };
    else if (direction === 'west') hit = { x: x + w, y: y + h / 2 + (w * Math.tan(alpha)) / 2 };
    else hit = { x, y: y + h / 2 - (w * Math.tan(alpha)) / 2 };
  } else {
    if (orthogonal) {
      if (next.y >= y && next.y <= y + h) {
        cx = vertical ? cx : direction === 'west' ? x + w : x;
        cy = next.y;
      } else if (next.x >= x && next.x <= x + w) {
        cx = next.x;
        cy = vertical ? (direction === 'north' ? y + h : y) : cy;
      }
    }
    hit =
      (vertical && next.x <= x + w / 2) || (!vertical && next.y <= y + h / 2)
        ? intersection(next.x, next.y, cx, cy, start.x, start.y, corner.x, corner.y)
        : intersection(next.x, next.y, cx, cy, corner.x, corner.y, end.x, end.y);
  }
  return hit ?? { x: cx, y: cy };
}

export function ellipsePerimeter(bounds: Rect, next: Point, orthogonal: boolean): Point {
  const { x, y } = bounds;
  const a = bounds.width / 2;
  const b = bounds.height / 2;
  const cx = x + a;
  const cy = y + b;
  const px = next.x;
  const py = next.y;
  // draw.io tronque l'écart au centre (`parseInt`).
  const dx = Math.trunc(px - cx);
  const dy = Math.trunc(py - cy);
  if (dx === 0 && dy !== 0) return { x: cx, y: cy + (b * dy) / Math.abs(dy) };
  if (dx === 0 && dy === 0) return { x: px, y: py };
  if (orthogonal) {
    if (py >= y && py <= y + bounds.height) {
      const ty = py - cy;
      let tx = Math.sqrt(a * a * (1 - (ty * ty) / (b * b))) || 0;
      if (px <= x) tx = -tx;
      return { x: cx + tx, y: py };
    }
    if (px >= x && px <= x + bounds.width) {
      const tx = px - cx;
      let ty = Math.sqrt(b * b * (1 - (tx * tx) / (a * a))) || 0;
      if (py <= y) ty = -ty;
      return { x: px, y: cy + ty };
    }
  }
  const d = dy / dx;
  const h = cy - d * cx;
  const e = a * a * d * d + b * b;
  const f = -2 * cx * e;
  const g = a * a * d * d * cx * cx + b * b * cx * cx - a * a * b * b;
  const det = Math.sqrt(f * f - 4 * e * g);
  const x1 = (-f + det) / (2 * e);
  const x2 = (-f - det) / (2 * e);
  const y1 = d * x1 + h;
  const y2 = d * x2 + h;
  return Math.hypot(x1 - px, y1 - py) < Math.hypot(x2 - px, y2 - py) ? { x: x1, y: y1 } : { x: x2, y: y2 };
}
