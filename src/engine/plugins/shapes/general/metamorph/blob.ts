import { boundsOfPoints, cubicTo, unit } from '../../../../core/plugins';
import type { Point, Rect } from '../../../../core/plugins';

/**
 * Contour en blob de la Metamorph (sujet 539) : silhouette molle relevée sur l'image de référence fournie. Courbe
 * lisse fermée (Catmull-Rom) passant par des points en fraction des bornes, étirée avec la forme.
 */

/**
 * Points de passage relevés sur le contour de l'image de référence (bord extérieur du trait, simplifié à 2,5 px près
 * sur 786 × 665), dans le sens horaire à l'écran (y vers le bas), depuis le haut.
 */
const BLOB: readonly [number, number][] = [
  [0.459, 0.0],
  [0.494, 0.006],
  [0.525, 0.027],
  [0.566, 0.039],
  [0.661, 0.03],
  [0.69, 0.042],
  [0.713, 0.062],
  [0.731, 0.089],
  [0.759, 0.176],
  [0.787, 0.227],
  [0.825, 0.271],
  [0.898, 0.315],
  [0.918, 0.331],
  [0.936, 0.355],
  [0.944, 0.378],
  [0.943, 0.411],
  [0.93, 0.44],
  [0.901, 0.471],
  [0.883, 0.506],
  [0.876, 0.569],
  [0.894, 0.622],
  [0.972, 0.742],
  [0.995, 0.797],
  [1.0, 0.831],
  [0.992, 0.881],
  [0.98, 0.914],
  [0.959, 0.937],
  [0.921, 0.952],
  [0.806, 0.937],
  [0.746, 0.94],
  [0.683, 0.953],
  [0.613, 0.98],
  [0.538, 0.997],
  [0.452, 0.997],
  [0.372, 0.971],
  [0.243, 0.904],
  [0.203, 0.895],
  [0.118, 0.896],
  [0.087, 0.889],
  [0.043, 0.863],
  [0.014, 0.828],
  [0.0, 0.776],
  [0.001, 0.739],
  [0.011, 0.7],
  [0.034, 0.652],
  [0.089, 0.58],
  [0.129, 0.515],
  [0.152, 0.458],
  [0.168, 0.396],
  [0.167, 0.324],
  [0.134, 0.206],
  [0.132, 0.172],
  [0.143, 0.133],
  [0.166, 0.102],
  [0.217, 0.08],
  [0.339, 0.084],
  [0.382, 0.057],
  [0.423, 0.015],
];

/** Cadre des points relevés : ramenés à toute la largeur et toute la hauteur des bornes. */
const FRAME = boundsOfPoints(BLOB.map(([x, y]) => ({ x, y })))!;

/** Points par tronçon de la courbe (les points relevés sont déjà serrés). */
const SEGMENTS = 3;

/** Contour en blob dans `bounds` (polygone fermé, sens horaire à l'écran). */
export function blobOutline({ x, y, width, height }: Rect): Point[] {
  const at = ([fx, fy]: readonly [number, number]): Point => ({
    x: x + ((fx - FRAME.x) / FRAME.width) * width,
    y: y + ((fy - FRAME.y) / FRAME.height) * height,
  });
  const points = BLOB.map(at);
  const n = points.length;
  const outline: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;
    // Catmull-Rom → Bézier : la tangente en un point suit ses deux voisins.
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    outline.push(...cubicTo(p1, c1, c2, p2, SEGMENTS));
  }
  return outline;
}

/**
 * Anneau autour d'un contour fermé (sens horaire à l'écran) : chaque point du contour et ce point poussé de `width`
 * vers l'extérieur (normale à la tangente de ses voisins).
 */
export function outerRing(outline: readonly Point[], width: number): { inner: Point; outer: Point }[] {
  const n = outline.length;
  return outline.map((point, i) => {
    const before = outline[(i - 1 + n) % n]!;
    const after = outline[(i + 1) % n]!;
    const tangent = unit({ x: after.x - before.x, y: after.y - before.y });
    // Sens horaire, y vers le bas : l'extérieur est à gauche de la marche.
    return { inner: point, outer: { x: point.x + tangent.y * width, y: point.y - tangent.x * width } };
  });
}
