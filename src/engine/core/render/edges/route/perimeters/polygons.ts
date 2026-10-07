import type { Point, Rect } from '../../../../model/types';
import type { PerimeterKind } from '../types';
import { intersection, number } from '../util';

/** Périmètres polygonaux (`mxPerimeter`) : étape, parallélogramme, hexagone. */

/**
 * Contour d'un périmètre polygonal de draw.io (fermé : le premier point est répété à la fin), dans `bounds`, ou
 * `undefined` pour les autres périmètres. Sert aussi à surligner le périmètre (`render/handleMeshes.ts`).
 */
export function perimeterPolygon(
  kind: PerimeterKind,
  bounds: Rect,
  style: Record<string, string>,
): Point[] | undefined {
  if (kind === 'hexagon') return hexagonPerimeter(bounds, style);
  if (kind === 'parallelogram') return parallelogramPerimeter(bounds, style);
  if (kind === 'step') return stepPerimeter(bounds, style);
  return undefined;
}

/**
 * `mxPerimeter.StepPerimeter` : chevron d'étape, encoche et pointe de profondeur `size` (px avec `fixedSize=1`,
 * 20 par défaut ; sinon fraction, 0,2), pointe vers `direction` (à droite par défaut).
 */
function stepPerimeter(bounds: Rect, style: Record<string, string>): Point[] {
  const offset = perimeterSize(style, 20, 0.2);
  const { x, y, width: w, height: h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const direction = style.direction ?? 'east';
  let points: Point[];
  if (direction === 'east') {
    const s = offset(w);
    points = [
      { x, y },
      { x: x + w - s, y },
      { x: x + w, y: cy },
      { x: x + w - s, y: y + h },
      { x, y: y + h },
      { x: x + s, y: cy },
    ];
  } else if (direction === 'west') {
    const s = offset(w);
    points = [
      { x: x + s, y },
      { x: x + w, y },
      { x: x + w - s, y: cy },
      { x: x + w, y: y + h },
      { x: x + s, y: y + h },
      { x, y: cy },
    ];
  } else if (direction === 'north') {
    const s = offset(h);
    points = [
      { x, y: y + s },
      { x: cx, y },
      { x: x + w, y: y + s },
      { x: x + w, y: y + h },
      { x: cx, y: y + h - s },
      { x, y: y + h },
    ];
  } else {
    const s = offset(h);
    points = [
      { x, y },
      { x: cx, y: y + s },
      { x: x + w, y },
      { x: x + w, y: y + h - s },
      { x: cx, y: y + h },
      { x, y: y + h - s },
    ];
  }
  return [...points, points[0]!];
}

/** Décalage d'un périmètre à pans (`size`) : px avec `fixedSize=1`, sinon fraction de `length`. */
function perimeterSize(style: Record<string, string>, fixedDefault: number, relativeDefault: number) {
  const fixed = (style.fixedSize ?? '0') !== '0';
  const size = number(style.size, fixed ? fixedDefault : relativeDefault);
  return (length: number, max = length) =>
    fixed ? Math.max(0, Math.min(max, size)) : length * Math.max(0, Math.min(1, size));
}

/**
 * `mxPerimeter.ParallelogramPerimeter` : côtés obliques décalés de `size` (px avec `fixedSize=1`, 20 par défaut,
 * au plus la demi-largeur ; sinon fraction, 0,2), debout avec `direction=north|south`.
 */
function parallelogramPerimeter(bounds: Rect, style: Record<string, string>): Point[] {
  const offset = perimeterSize(style, 20, 0.2);
  const { x, y, width: w, height: h } = bounds;
  if (style.direction === 'north' || style.direction === 'south') {
    const s = offset(h);
    return [
      { x, y },
      { x: x + w, y: y + s },
      { x: x + w, y: y + h },
      { x, y: y + h - s },
      { x, y },
    ];
  }
  const s = offset(w, w / 2);
  return [
    { x: x + s, y },
    { x: x + w, y },
    { x: x + w - s, y: y + h },
    { x, y: y + h },
    { x: x + s, y },
  ];
}

/**
 * `mxPerimeter.HexagonPerimeter2` : hexagone couché, pointes à gauche et à droite (debout avec
 * `direction=north|south`), pans de `size` (px avec `fixedSize=1`, 20 par défaut ; sinon fraction, 0,25).
 */
function hexagonPerimeter(bounds: Rect, style: Record<string, string>): Point[] {
  const offset = perimeterSize(style, 20, 0.25);
  const { x, y, width: w, height: h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  if (style.direction === 'north' || style.direction === 'south') {
    const s = offset(h);
    return [
      { x: cx, y },
      { x: x + w, y: y + s },
      { x: x + w, y: y + h - s },
      { x: cx, y: y + h },
      { x, y: y + h - s },
      { x, y: y + s },
      { x: cx, y },
    ];
  }
  const s = offset(w);
  return [
    { x: x + s, y },
    { x: x + w - s, y },
    { x: x + w, y: cy },
    { x: x + w - s, y: y + h },
    { x: x + s, y: y + h },
    { x, y: cy },
    { x: x + s, y },
  ];
}

/**
 * Point d'un périmètre polygonal visé depuis `next` (fin des `mxPerimeter` polygonaux et
 * `mxUtils.getPerimeterPoint`) : intersection la plus proche de `next` entre le contour et le segment qui part
 * du centre, ramené dans l'axe de `next` si `orthogonal`.
 */
export function polygonPerimeter(polygon: Point[], bounds: Rect, next: Point, orthogonal: boolean): Point {
  const c = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  if (orthogonal) {
    if (next.x < bounds.x || next.x > bounds.x + bounds.width) c.y = next.y;
    else c.x = next.x;
  }
  let best: { p: Point; distSq: number } | undefined;
  for (let i = 0; i + 1 < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[i + 1]!;
    const p = intersection(a.x, a.y, b.x, b.y, c.x, c.y, next.x, next.y);
    if (!p) continue;
    const distSq = (next.x - p.x) ** 2 + (next.y - p.y) ** 2;
    if (!best || best.distSq > distSq) best = { p, distSq };
  }
  // draw.io renvoie alors `null` (bout au centre de la forme, via getPoint) : même repli que le losange.
  return best?.p ?? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
