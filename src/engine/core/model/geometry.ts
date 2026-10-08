import { clamp } from './numbers';
import type { Point, Rect } from './types';

/** Petits calculs de géométrie plane partagés (points, rectangles, segments, polygones), en pixels de page. */

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Vecteur `v` ramené à la longueur 1 ; nul s'il est nul. */
export function unit(v: Point): Point {
  const length = Math.hypot(v.x, v.y);
  return length === 0 ? { x: 0, y: 0 } : { x: v.x / length, y: v.y / length };
}

/** Vecteur unitaire du segment `from → to` (nul si les points sont confondus). */
export function direction(from: Point, to: Point): Point {
  return unit({ x: to.x - from.x, y: to.y - from.y });
}

/** Mêmes coordonnées exactement. */
export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Mêmes points, dans le même ordre. */
export function samePoints(a: readonly Point[], b: readonly Point[]): boolean {
  return a.length === b.length && a.every((p, i) => samePoint(p, b[i]!));
}

/** Même position et même taille exactement. */
export function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/**
 * Coins du rectangle dans l'ordre du tour : haut-gauche, haut-droit, bas-droit, bas-gauche (y vers le bas). C'est aussi
 * son contour fermé (le dernier point n'est pas répété), d'où le nom partagé avec les contours du rendu.
 */
export function rectPath({ x, y, width, height }: Rect): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/**
 * Échelle qui fait tenir `content` dans `available` (le côté le plus serré décide) ; `fallback` pour un contenu sans
 * étendue (point). Un côté nul du contenu ne borne pas (1e-6 évite la division par zéro).
 */
export function fitScale(
  content: { readonly width: number; readonly height: number },
  available: { readonly width: number; readonly height: number },
  fallback: number,
): number {
  return content.width > 0 || content.height > 0
    ? Math.min(available.width / Math.max(content.width, 1e-6), available.height / Math.max(content.height, 1e-6))
    : fallback;
}

/**
 * Longueur arrondie au multiple supérieur du pas de grille (sujet 263) ; sans grille (`step` ≤ 0), inchangée. Une
 * traîne de flottant (`130.0000001`) ne fait pas sauter d'un pas.
 */
export function ceilToGrid(value: number, step: number): number {
  return step > 0 ? Math.ceil(value / step - 1e-6) * step : value;
}

/**
 * Valeur aimantée au pas de grille le plus proche, comme draw.io au déplacement, au redimensionnement et au dépôt.
 * Sans grille (`grid` ≤ 0), arrondie au pixel : une position éditée reste entière, contrairement à `ceilToGrid` qui
 * laisse une taille inchangée.
 */
export function snapToGrid(value: number, grid: number): number {
  const step = grid > 0 ? grid : 1;
  return Math.round(value / step) * step;
}

/** Point aimanté à la grille sur ses deux coordonnées (`snapToGrid`). */
export function snapPoint(p: Point, grid: number): Point {
  return { x: snapToGrid(p.x, grid), y: snapToGrid(p.y, grid) };
}

/** Le point est-il dans le rectangle, bord compris ? */
export function rectContains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** Le rectangle `inner` est-il entièrement dans `outer`, bords compris ? */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

/** Les deux rectangles se chevauchent-ils (bords exclus : deux rectangles qui se touchent ne se chevauchent pas) ? */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Plus petit rectangle contenant tous les points ; undefined sans point. */
export function boundsOfPoints(points: readonly Point[]): Rect | undefined {
  if (points.length === 0) return undefined;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Rectangle agrandi de `by` de chaque côté (rétréci si `by` est négatif). */
export function inflate(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by };
}

/** Distance d'un point au rectangle (bords compris) ; 0 dedans. */
export function rectDistance(r: Rect, p: Point): number {
  return Math.hypot(Math.max(r.x - p.x, 0, p.x - r.x - r.width), Math.max(r.y - p.y, 0, p.y - r.y - r.height));
}

/** Point où le segment du centre du rectangle vers `toward` en franchit le bord ; le centre si `toward` y est. */
export function rectExitPoint(r: Rect, toward: Point): Point {
  const c = center(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const t = Math.min(
    dx === 0 ? Infinity : r.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : r.height / 2 / Math.abs(dy),
  );
  return t === Infinity ? c : { x: c.x + dx * t, y: c.y + dy * t };
}

/** Plus petit rectangle contenant tous les rectangles ; undefined sans rectangle. */
export function unionOf(rects: readonly Rect[]): Rect | undefined {
  return boundsOfPoints(
    rects.flatMap((r) => [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ]),
  );
}

/** Produit vectoriel de `o → a` et `o → b` : positif si `b` est à gauche de `o → a` (repère mathématique). */
export function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Les segments `[a, b]` et `[c, d]` se croisent-ils franchement (chacun de part et d'autre de l'autre, au-delà de
 * `epsilon`) ? Un bout posé sur l'autre segment, ou des segments alignés, ne comptent pas.
 */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point, epsilon = 0): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return (
    ((d1 > epsilon && d2 < -epsilon) || (d1 < -epsilon && d2 > epsilon)) &&
    ((d3 > epsilon && d4 < -epsilon) || (d3 < -epsilon && d4 > epsilon))
  );
}

/** Point d'intersection des segments `[a, b]` et `[c, d]`, bouts compris (mxUtils.intersection), ou undefined. */
export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const denominator = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
  if (denominator === 0) return undefined;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return undefined;
  return { x: a.x + ua * (b.x - a.x), y: a.y + ua * (b.y - a.y) };
}

/**
 * Projection de `p` sur le segment `[a, b]` : paramètre `t` dans [0, 1] (0 en `a`, 1 en `b`) et point du segment le
 * plus proche ; `a` (t = 0) si le segment est nul.
 */
export function segmentProjection(p: Point, a: Point, b: Point): { t: number; point: Point } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0, 1);
  return { t, point: { x: a.x + t * dx, y: a.y + t * dy } };
}

/** Carré de la distance de `p` au segment `[a, b]` (mxUtils.ptSegDistSq). */
export function segmentDistanceSquared(p: Point, a: Point, b: Point): number {
  const { point } = segmentProjection(p, a, b);
  const x = point.x - p.x;
  const y = point.y - p.y;
  return x * x + y * y;
}

/** Distance de `p` au segment `[a, b]`. */
export function segmentDistance(p: Point, a: Point, b: Point): number {
  return Math.sqrt(segmentDistanceSquared(p, a, b));
}

/** Point dans un polygone (règle pair-impair), bord compris à la précision près. */
export function insidePolygon(polygon: readonly Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (segmentDistance(p, a, b) < 1e-6) return true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * Retire d'un tracé les points confondus et ceux alignés avec leurs voisins (à `epsilon` près). Avec
 * `keepBacktracks`, un point où le tracé repart en arrière sur sa droite (demi-tour) est gardé, sinon il est retiré
 * comme un point aligné.
 */
export function prunePath(path: readonly Point[], epsilon: number, keepBacktracks: boolean): Point[] {
  const result: Point[] = [];
  for (const p of path) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.x - p.x) < epsilon && Math.abs(last.y - p.y) < epsilon) continue;
    const before = result[result.length - 2];
    const aligned = before && last && Math.abs(cross(before, last, p)) < epsilon;
    const forward = aligned && (last.x - before.x) * (p.x - last.x) + (last.y - before.y) * (p.y - last.y) > 0;
    if (aligned && (forward || !keepBacktracks)) result[result.length - 1] = p;
    else result.push(p);
  }
  return result;
}

/**
 * Tracé calculé nettoyé (contournement des ancrages automatique et Typon) : points confondus et alignés retirés,
 * demi-tours compris (un pic n'a pas de sens dans un tracé calculé).
 */
export function simplifyPath(path: readonly Point[], epsilon = 1e-6): Point[] {
  return prunePath(path, epsilon, false);
}
