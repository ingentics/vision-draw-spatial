import type { Point } from '../../model/types';

/**
 * Sauts de ligne aux croisements (`jumpStyle`, `jumpSize`, ticket 129), comme draw.io
 * (`mxGraphView.updateLineJumps`, `mxConnector.paintLine`) : une flèche saute par-dessus les flèches dessinées
 * avant elle (dessous), sauf celles en `noJump=1`. Calcul pur, en coordonnées page.
 */

export type JumpStyle = 'arc' | 'gap' | 'sharp' | 'line';

export const JUMP_STYLES: readonly JumpStyle[] = ['arc', 'gap', 'sharp', 'line'];

/** `Graph.defaultJumpSize` de draw.io. */
export const DEFAULT_JUMP_SIZE = 6;

/** Distance minimale (px) d'un croisement aux bouts du segment, et tolérance d'alignement (draw.io : 0,5 et 1). */
const END_TOLERANCE = 0.5;

/** Point d'un tracé à sauts : `z` = hauteur au-dessus de la page d'un saut en relief (absent : dans le plan). */
export type JumpPoint = Point & { z?: number };

/** Saut par défaut des flèches d'une page (le sien, sinon celui de l'appli) : suivi par une flèche sans `jumpStyle`. */
export interface JumpDefaults {
  style: JumpStyle | 'none';
  /** Taille quand la flèche n'a pas de `jumpSize`. */
  size: number;
}

/** Valeur de saut valide (`none` compris), sinon undefined (absente ou inconnue). */
export function jumpValue(value: string | undefined): JumpStyle | 'none' | undefined {
  return value === 'none' || JUMP_STYLES.includes(value as JumpStyle) ? (value as JumpStyle | 'none') : undefined;
}

/**
 * Style de saut d'une flèche : son `jumpStyle`, sinon celui de la page (`defaults`) ; undefined si elle ne saute pas
 * (`none`, ou flèche courbe).
 */
export function jumpStyleOf(style: Record<string, string>, defaults?: JumpDefaults): JumpStyle | undefined {
  if (style.curved === '1') return undefined;
  const value = jumpValue(style.jumpStyle) ?? defaults?.style;
  return value === 'none' ? undefined : value;
}

/** Demi-longueur d'un saut, comme draw.io : `(jumpSize − 2) / 2 + strokeWidth` (taille par défaut : `defaults`). */
export function jumpHalfLength(style: Record<string, string>, strokeWidth: number, defaults?: JumpDefaults): number {
  const size = parseInt(style.jumpSize ?? '', 10);
  return ((Number.isFinite(size) ? size : (defaults?.size ?? DEFAULT_JUMP_SIZE)) - 2) / 2 + strokeWidth;
}

/**
 * Tracé d'une flèche avec ses sauts : une ou plusieurs polylignes (une coupure ouvre un nouveau morceau). Sans
 * croisement, le tracé est rendu tel quel.
 *
 * @param line tracé dessiné (raccourci aux pointes, coudes arrondis)
 * @param below tracés des flèches dessinées avant (dessous)
 * @param half demi-longueur d'un saut (`jumpHalfLength`)
 * @param raised vue en volume (iso, 3D) : l'arc et la marche se lèvent hors du plan (`z`, ticket 146) au lieu de se
 *   déporter sur le côté
 */
export function withJumps(
  line: Point[],
  below: readonly Point[][],
  style: JumpStyle,
  half: number,
  raised = false,
): JumpPoint[][] {
  if (line.length < 2 || below.length === 0 || half <= 0) return [line];
  const pieces: JumpPoint[][] = [];
  let piece: JumpPoint[] = [line[0]!];
  let jumped = false;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    const u = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
    // Côté du saut, comme draw.io : vers le haut, ou vers la droite pour un segment vertical.
    const h = { x: u.x * half, y: u.y * half };
    const sign = Math.round(h.x) < 0 || (Math.round(h.x) === 0 && Math.round(h.y) <= 0) ? 1 : -1;
    const side = { x: -h.y * sign, y: h.x * sign };
    for (const along of crossings(a, b, below)) {
      // Assez de place avant et après le croisement sur le segment.
      if (along <= half || length - along <= half) continue;
      const at = { x: a.x + u.x * along, y: a.y + u.y * along };
      const p0 = { x: at.x - h.x, y: at.y - h.y };
      const p1 = { x: at.x + h.x, y: at.y + h.y };
      const lift = (p: Point, k = 1): JumpPoint =>
        raised && style !== 'line' ? { ...p, z: half * k } : { x: p.x + side.x * k, y: p.y + side.y * k };
      jumped = true;
      piece.push(p0);
      if (style === 'arc') {
        // Courbe de Bézier cubique, points de contrôle à 1,3 × la demi-longueur (draw.io).
        const c0 = lift(p0, 1.3);
        const c1 = lift(p1, 1.3);
        for (let s = 1; s < ARC_STEPS; s++) {
          const t = s / ARC_STEPS;
          const k0 = (1 - t) ** 3;
          const k1 = 3 * (1 - t) ** 2 * t;
          const k2 = 3 * (1 - t) * t ** 2;
          const k3 = t ** 3;
          piece.push({
            x: k0 * p0.x + k1 * c0.x + k2 * c1.x + k3 * p1.x,
            y: k0 * p0.y + k1 * c0.y + k2 * c1.y + k3 * p1.y,
            ...(raised && { z: (k1 + k2) * 1.3 * half }),
          });
        }
        piece.push(p1);
      } else if (style === 'sharp') {
        piece.push(lift(p0), lift(p1), p1);
      } else {
        pieces.push(piece);
        // Ligne : la coupure est bordée de deux petits traits en travers.
        if (style === 'line') pieces.push([lift(p0, -1), lift(p0)], [lift(p1), lift(p1, -1)]);
        piece = [p1];
      }
    }
    piece.push(b);
  }
  pieces.push(piece);
  return jumped ? pieces : [line];
}

const ARC_STEPS = 10;

/**
 * Croisements du segment `a → b` avec les tracés `below` : distances depuis `a`, triées, sans doublon. Un
 * croisement trop près d'un bout d'un des deux segments (contact, départ commun) ne compte pas.
 */
function crossings(a: Point, b: Point, below: readonly Point[][]): number[] {
  const result: number[] = [];
  for (const path of below)
    for (let j = 1; j < path.length; j++) {
      const hit = intersection(a, b, path[j - 1]!, path[j]!);
      if (!hit) continue;
      const near = (p: Point) => Math.abs(hit.x - p.x) <= END_TOLERANCE && Math.abs(hit.y - p.y) <= END_TOLERANCE;
      if (near(a) || near(b) || near(path[j - 1]!) || near(path[j]!)) continue;
      result.push(Math.hypot(hit.x - a.x, hit.y - a.y));
    }
  result.sort((x, y) => x - y);
  return result.filter((d, i) => i === 0 || d - result[i - 1]! > 1e-6);
}

/** Point d'intersection de deux segments (undefined s'ils sont parallèles ou ne se coupent pas). */
function intersection(a: Point, b: Point, c: Point, d: Point): Point | undefined {
  const denominator = (d.y - c.y) * (b.x - a.x) - (d.x - c.x) * (b.y - a.y);
  if (denominator === 0) return undefined;
  const ua = ((d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)) / denominator;
  const ub = ((b.x - a.x) * (a.y - c.y) - (b.y - a.y) * (a.x - c.x)) / denominator;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return undefined;
  return { x: a.x + ua * (b.x - a.x), y: a.y + ua * (b.y - a.y) };
}
