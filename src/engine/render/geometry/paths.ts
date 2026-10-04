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

/** Rayon des coins d'un polygone arrondi de draw.io (`rounded=1`) : la moitié de `arcSize`, en px (10 par défaut). */
export function polygonArc(style: Record<string, string>): number {
  const arcSize = parseFloat(style.arcSize ?? '');
  return (Number.isFinite(arcSize) ? arcSize : 20) / 2;
}

/**
 * Polygone fermé aux coins arrondis, **porté de draw.io** (`mxShape.addPoints`, mxGraph, Apache 2.0) : le tracé
 * part du milieu du dernier côté ; à chaque sommet, il s'arrête à `arc` px du coin (au plus la moitié du côté) et le
 * contourne par une courbe quadratique dont le coin est le point de contrôle, découpée en `segments` segments. Les
 * sommets confondus avec le précédent sont sautés, comme dans draw.io.
 */
export function roundedPolygon(points: Point[], arc: number, segments = 8): Point[] {
  if (points.length < 3 || arc <= 0) return points;
  const last = points[points.length - 1]!;
  const first = points[0]!;
  const pts = [{ x: last.x + (first.x - last.x) / 2, y: last.y + (first.y - last.y) / 2 }, ...points];
  const n = pts.length;
  const out: Point[] = [pts[0]!];
  let current = pts[0]!;
  for (let l = 1; l < n; l++) {
    const corner = pts[l % n]!;
    let dx = current.x - corner.x;
    let dy = current.y - corner.y;
    if (dx === 0 && dy === 0) {
      out.push(corner);
      current = corner;
      continue;
    }
    let length = Math.hypot(dx, dy);
    const start = {
      x: corner.x + (dx * Math.min(arc, length / 2)) / length,
      y: corner.y + (dy * Math.min(arc, length / 2)) / length,
    };
    let next = pts[(l + 1) % n]!;
    while (l < n - 2 && Math.round(next.x - corner.x) === 0 && Math.round(next.y - corner.y) === 0) {
      next = pts[(l + 2) % n]!;
      l++;
    }
    dx = next.x - corner.x;
    dy = next.y - corner.y;
    length = Math.max(1, Math.hypot(dx, dy));
    const end = {
      x: corner.x + (dx * Math.min(arc, length / 2)) / length,
      y: corner.y + (dy * Math.min(arc, length / 2)) / length,
    };
    out.push(start);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const u = 1 - t;
      out.push({
        x: u * u * start.x + 2 * u * t * corner.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * corner.y + t * t * end.y,
      });
    }
    current = end;
  }
  return out;
}
