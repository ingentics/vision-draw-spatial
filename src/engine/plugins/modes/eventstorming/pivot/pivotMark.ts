import { Color, Group } from 'three';
import { strokeMesh } from '../../../../core/plugins';
import type { Point, Rect } from '../../../../core/plugins';
import { at, CORNER_MARK, cornerMarkRect } from '../shapes/common/cornerMark';

/**
 * Icône de la réponse « Pivot » Oui d'un Domain Event (sujet 516), en haut à droite du post-it : cube entouré de huit
 * flèches ; trait noir de 1, à 70 % pour rester discret. Je ne sais pas : pastille en haut à gauche (sujet 519,
 * `warnings/stickyBadge.ts`).
 */
export const PIVOT_MARK = { ...CORNER_MARK, opacity: 0.7 } as const;

/** Un tracé ouvert ou fermé, en coordonnées du carré de 20 de l'icône. */
interface MarkPath {
  points: Point[];
  closed?: boolean;
}

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

/** Carré de l'icône en haut à droite de `bounds`. */
export function pivotMarkRect(bounds: Rect): Rect {
  return cornerMarkRect(bounds, 'right');
}

/** Icône du pivot Oui en haut à droite de `bounds`. */
export function pivotMark(bounds: Rect): Group {
  const { x, y } = pivotMarkRect(bounds);
  const group = new Group();
  group.name = 'pivot-mark';
  const color = new Color('#000000');
  for (const path of spreadPaths()) {
    const points = path.points.map((p) => at(x + p.x, y + p.y));
    const mesh = strokeMesh(points, color, PIVOT_MARK.opacity, { width: 1, closed: !!path.closed });
    if (mesh) group.add(mesh);
  }
  return group;
}
