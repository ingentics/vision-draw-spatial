import type { Point } from '../../model/types';

/**
 * Homographie qui envoie le rectangle (0, 0)–(`width`, `height`) sur un quadrilatère (coins haut-gauche,
 * haut-droit, bas-droit, bas-gauche) : `[a, b, c, d, e, f, g, h]`, avec
 * X = (a·x + b·y + c) / (g·x + h·y + 1) et Y = (d·x + e·y + f) / (g·x + h·y + 1).
 * Sert à plaquer l'éditeur de texte sur le plan d'un toit vu en perspective (Heckbert, carré → quadrilatère).
 */
export function rectToQuad(width: number, height: number, corners: readonly Point[]): number[] {
  const [p0, p1, p2, p3] = corners as [Point, Point, Point, Point];
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const projective = Math.abs(den) > 1e-12 && (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9);
  const g = projective ? (dx3 * dy2 - dx2 * dy3) / den : 0;
  const h = projective ? (dx1 * dy3 - dx3 * dy1) / den : 0;
  // Carré unité → quadrilatère, puis rectangle → carré unité.
  const w = width || 1;
  const v = height || 1;
  return [
    (p1.x - p0.x + g * p1.x) / w,
    (p3.x - p0.x + h * p3.x) / v,
    p0.x,
    (p1.y - p0.y + g * p1.y) / w,
    (p3.y - p0.y + h * p3.y) / v,
    p0.y,
    g / w,
    h / v,
  ];
}

/** Point du rectangle envoyé par l'homographie `rectToQuad`. */
export function applyHomography(m: readonly number[], point: Point): Point {
  const [a, b, c, d, e, f, g, h] = m as [number, number, number, number, number, number, number, number];
  const w = g * point.x + h * point.y + 1;
  return { x: (a * point.x + b * point.y + c) / w, y: (d * point.x + e * point.y + f) / w };
}

/** Transformation CSS `matrix3d` de l'homographie (origine de la transformation : coin haut-gauche). */
export function homographyCss(m: readonly number[]): string {
  const [a, b, c, d, e, f, g, h] = m as [number, number, number, number, number, number, number, number];
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].join(', ')})`;
}
