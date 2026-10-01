import type { Point } from '../../model/types';

/**
 * Traits épais posés au sol : une polyligne devient un ruban de triangles d'épaisseur
 * exprimée en unités du monde (comme draw.io, l'épaisseur suit le zoom).
 */

const MITER_LIMIT = 4;
const EPSILON = 1e-9;

/** Triangles (x, y) d'un trait le long de `points`. Tableau vide si rien à dessiner. */
export function strokeTriangles(input: Point[], width: number, closed: boolean): number[] {
  const points = dedupe(input, closed);
  if (points.length < 2 || width <= 0) return [];
  const half = width / 2;
  const n = points.length;
  const segmentCount = closed ? n : n - 1;

  const normals: Point[] = [];
  for (let i = 0; i < segmentCount; i++) normals.push(segmentNormal(points[i]!, points[(i + 1) % n]!));

  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = closed ? normals[(i - 1 + segmentCount) % segmentCount] : normals[i - 1];
    const next = closed ? normals[i % segmentCount] : normals[i];
    const offset = miterOffset(prev, next, half);
    const p = points[i]!;
    left.push({ x: p.x + offset.x, y: p.y + offset.y });
    right.push({ x: p.x - offset.x, y: p.y - offset.y });
  }

  const triangles: number[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const j = (i + 1) % n;
    const [a, b, c, d] = [left[i]!, right[i]!, left[j]!, right[j]!];
    triangles.push(a.x, a.y, b.x, b.y, c.x, c.y, c.x, c.y, b.x, b.y, d.x, d.y);
  }
  return triangles;
}

/**
 * Découpe une polyligne en tirets. `pattern` alterne longueurs pleines et vides (en unités monde).
 * Chaque tiret est une polyligne ouverte, qui peut franchir un angle.
 */
export function dashPolyline(input: Point[], pattern: number[], closed: boolean, offset = 0): Point[][] {
  const points = dedupe(input, closed);
  if (closed && points.length > 0) points.push(points[0]!);
  const cleanPattern = pattern.filter((v) => v > 0);
  if (points.length < 2 || cleanPattern.length === 0) return points.length >= 2 ? [points] : [];

  const dashes: Point[][] = [];
  // Décalage de départ dans le motif (sélection animée : les tirets défilent le long du tracé).
  // Motif de longueur impaire : on raisonne sur deux périodes pour garder l'alternance plein / vide.
  const cycle = cleanPattern.length % 2 === 0 ? cleanPattern : [...cleanPattern, ...cleanPattern];
  const total = cycle.reduce((sum, v) => sum + v, 0);
  let phase = ((offset % total) + total) % total;
  let patternIndex = 0;
  while (phase >= cycle[patternIndex]!) {
    phase -= cycle[patternIndex]!;
    patternIndex = (patternIndex + 1) % cycle.length;
  }
  let remaining = cycle[patternIndex]! - phase;
  let drawing = patternIndex % 2 === 0;
  let current: Point[] = [points[0]!];

  for (let i = 0; i < points.length - 1; i++) {
    let from = points[i]!;
    const to = points[i + 1]!;
    let segmentLeft = distance(from, to);
    while (segmentLeft > EPSILON) {
      const step = Math.min(remaining, segmentLeft);
      const t = step / segmentLeft;
      const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      if (drawing) current.push(point);
      from = point;
      segmentLeft -= step;
      remaining -= step;
      if (remaining <= EPSILON) {
        if (drawing && current.length >= 2) dashes.push(current);
        drawing = !drawing;
        patternIndex = (patternIndex + 1) % cycle.length;
        remaining = cycle[patternIndex]!;
        current = [point];
      }
    }
  }
  if (drawing && current.length >= 2) dashes.push(current);
  return dashes;
}

/** Motif de pointillés draw.io : `dashPattern` (défaut « 3 3 »), multiplié par l'épaisseur sauf `fixDash=1`. */
export function dashPattern(style: Record<string, string>, strokeWidth: number): number[] | undefined {
  if (style.dashed !== '1') return undefined;
  const base = (style.dashPattern ?? '3 3')
    .split(/\s+/)
    .map(Number)
    .filter((v) => Number.isFinite(v) && v >= 0);
  const pattern = base.length > 0 ? base : [3, 3];
  const scale = style.fixDash === '1' ? 1 : Math.max(strokeWidth, 1);
  return pattern.map((v) => v * scale);
}

function dedupe(points: Point[], closed: boolean): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (!last || distance(last, p) > EPSILON) result.push(p);
  }
  if (closed && result.length > 1 && distance(result[0]!, result[result.length - 1]!) <= EPSILON) result.pop();
  return result;
}

function segmentNormal(a: Point, b: Point): Point {
  const len = distance(a, b);
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
}

function miterOffset(prev: Point | undefined, next: Point | undefined, half: number): Point {
  if (!prev) return scale(next!, half);
  if (!next) return scale(prev, half);
  const sum = { x: prev.x + next.x, y: prev.y + next.y };
  const len = Math.hypot(sum.x, sum.y);
  if (len < EPSILON) return scale(next, half); // demi-tour
  const miter = { x: sum.x / len, y: sum.y / len };
  const cos = miter.x * next.x + miter.y * next.y;
  return scale(miter, half / Math.max(cos, 1 / MITER_LIMIT));
}

function scale(p: Point, k: number): Point {
  return { x: p.x * k, y: p.y * k };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
