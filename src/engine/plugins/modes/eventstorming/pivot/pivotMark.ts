import { Color, Group } from 'three';
import { strokeMesh } from '../../../../core/plugins';
import type { Point, Rect } from '../../../../core/plugins';
import type { PivotMarkKind } from './pivot';

/**
 * Icônes de la réponse « Pivot » d'un Domain Event (sujet 516), en haut à droite du post-it : cube entouré de huit
 * flèches pour Oui, triangle d'alerte pour Je ne sais pas ; trait noir de 1, à 70 % pour rester discret.
 */
export const PIVOT_MARK = {
  /** Carré de l'icône, et retrait depuis les bords haut et droit du post-it. */
  size: 20,
  inset: 7,
  opacity: 0.7,
  /** Écart laissé entre le label du type et l'icône. */
  gap: 3,
} as const;

/** Un tracé ouvert ou fermé, en coordonnées du carré de 20 de l'icône. */
interface MarkPath {
  points: Point[];
  closed?: boolean;
}

const at = (x: number, y: number): Point => ({ x, y });

/** Flèche du centre vers l'extérieur, dans la direction `angle` : tige de `from` à `to`, pointe de 1,6. */
function arrow(angle: number, from: number, to: number): MarkPath[] {
  const c = 10;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tip = at(c + dx * to, c + dy * to);
  const head = 1.6;
  const back = (side: number) =>
    at(
      tip.x - head * (dx * Math.SQRT1_2 - side * dy * Math.SQRT1_2),
      tip.y - head * (dy * Math.SQRT1_2 + side * dx * Math.SQRT1_2),
    );
  return [{ points: [at(c + dx * from, c + dy * from), tip] }, { points: [back(1), tip, back(-1)] }];
}

/** Cube en perspective cavalière au centre (hexagone et ses trois arêtes intérieures), huit flèches autour. */
function spreadPaths(): MarkPath[] {
  const hexagon = [at(10, 5.5), at(13.9, 7.4), at(13.9, 12.1), at(10, 14.2), at(6.1, 12.1), at(6.1, 7.4)];
  const middle = at(10, 9.4);
  return [
    { points: hexagon, closed: true },
    { points: [at(6.1, 7.4), middle, at(13.9, 7.4)] },
    { points: [middle, at(10, 14.2)] },
    ...Array.from({ length: 8 }, (_, i) => arrow((i * Math.PI) / 4, 6.8, 9.8)).flat(),
  ];
}

/** Triangle d'alerte, pointe en haut, et point d'exclamation (tige et point). */
function warningPaths(): MarkPath[] {
  return [
    { points: [at(10, 1.5), at(19, 18), at(1, 18)], closed: true },
    { points: [at(10, 7), at(10, 12.5)] },
    { points: [at(10, 14.6), at(10, 15.6)] },
  ];
}

/** Carré de l'icône en haut à droite de `bounds`. */
export function pivotMarkRect(bounds: Rect): Rect {
  const { size, inset } = PIVOT_MARK;
  return { x: bounds.x + bounds.width - inset - size, y: bounds.y + inset, width: size, height: size };
}

/** Icône `kind` en haut à droite de `bounds`. */
export function pivotMark(kind: PivotMarkKind, bounds: Rect): Group {
  const { x, y } = pivotMarkRect(bounds);
  const group = new Group();
  group.name = `pivot-mark:${kind}`;
  const color = new Color('#000000');
  for (const path of kind === 'spread' ? spreadPaths() : warningPaths()) {
    const points = path.points.map((p) => at(x + p.x, y + p.y));
    const mesh = strokeMesh(points, color, PIVOT_MARK.opacity, { width: 1, closed: !!path.closed });
    if (mesh) group.add(mesh);
  }
  return group;
}
