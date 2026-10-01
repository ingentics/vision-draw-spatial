import type { Point, Rect } from '../../model/types';

/** Contours fermés en coordonnées page (le dernier point n'est pas répété). */

export function rectPath({ x, y, width, height }: Rect): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** Rectangle à coins arrondis ; rayon borné à la moitié du plus petit côté. */
export function roundedRectPath(rect: Rect, radius: number, segmentsPerCorner = 8): Point[] {
  const r = Math.min(radius, rect.width / 2, rect.height / 2);
  if (r <= 0) return rectPath(rect);
  const { x, y, width: w, height: h } = rect;
  const corners: Array<[number, number, number]> = [
    [x + w - r, y + r, -Math.PI / 2], // haut droit
    [x + w - r, y + h - r, 0], // bas droit
    [x + r, y + h - r, Math.PI / 2], // bas gauche
    [x + r, y + r, Math.PI], // haut gauche
  ];
  const points: Point[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= segmentsPerCorner; i++) {
      const a = start + (i / segmentsPerCorner) * (Math.PI / 2);
      points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return points;
}

export function ellipsePath({ x, y, width, height }: Rect, segments = 64): Point[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push({ x: cx + (width / 2) * Math.cos(a), y: cy + (height / 2) * Math.sin(a) });
  }
  return points;
}

/**
 * Rayon des coins arrondis selon draw.io : `arcSize` en % du plus petit côté (défaut 15),
 * ou en pixels (diamètre) si `absoluteArcSize=1` (défaut 20).
 */
export function cornerRadius(style: Record<string, string>, rect: Rect): number {
  const absolute = style.absoluteArcSize === '1';
  const arcSize = parseFloat(style.arcSize ?? '');
  if (absolute) return (Number.isFinite(arcSize) ? arcSize : 20) / 2;
  return (Math.min(rect.width, rect.height) * (Number.isFinite(arcSize) ? arcSize : 15)) / 100;
}
