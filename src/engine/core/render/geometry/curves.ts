import type { Point } from '../../model/types';

/**
 * Courbes des formes draw.io dessinées par des chemins (cylindres…) : les mêmes courbes de Bézier
 * cubiques que leurs `redrawPath`, échantillonnées en polylignes.
 */

/** Points d'une Bézier cubique, du départ (exclu) à l'arrivée (incluse) : à enchaîner après le point courant. */
export function cubicTo(from: Point, c1: Point, c2: Point, to: Point, segments = 16): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    points.push({
      x: a * from.x + b * c1.x + c * c2.x + d * to.x,
      y: a * from.y + b * c1.y + c * c2.y + d * to.y,
    });
  }
  return points;
}

/**
 * Demi-ellipse d'axes alignés, de `from` à `to` (extrémités d'un même diamètre vertical), bombée
 * vers `side` (-1 = à gauche, 1 = à droite) avec la demi-largeur `rx`. Départ exclu, arrivée incluse.
 */
export function halfEllipseTo(from: Point, to: Point, rx: number, side: -1 | 1, segments = 24): Point[] {
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2;
  const ry = (to.y - from.y) / 2;
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    // De -90° (from) à +90° (to) en passant par le côté bombé.
    const angle = -Math.PI / 2 + (Math.PI * i) / segments;
    points.push({ x: cx + side * rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  }
  return points;
}
