import { Color, Group } from 'three';
import { strokeMesh } from '../../../../core/plugins';
import type { Point, Rect } from '../../../../core/plugins';
import type { PivotMarkKind } from './pivot';

/**
 * Icônes de la réponse « Pivot » d'un Domain Event (sujets 516, 517), en haut à droite du post-it : cube entouré de
 * huit flèches pour Oui, point d'interrogation pour Je ne sais pas ; trait noir de 1, à 70 % pour rester discret.
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

/** Point du cercle de centre `c` et de rayon `r`, à l'angle `angle` (y vers le bas : π/2 en bas). */
const onCircle = (c: Point, r: number, angle: number): Point =>
  at(c.x + r * Math.cos(angle), c.y + r * Math.sin(angle));

/** Courbe de Bézier cubique de `p0` à `p3`, en `steps` segments. */
function bezier(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const [a, b, c, d] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return at(a * p0.x + b * p1.x + c * p2.x + d * p3.x, a * p0.y + b * p1.y + c * p2.y + d * p3.y);
  });
}

/**
 * Point d'interrogation (sujet 517), centré dans le carré, de 2,6 à 17,6 : crochet en arc de cercle (rayon 4, de
 * l'avant-gauche par le haut jusqu'en bas à droite), qui se prolonge sans cassure par une courbe jusqu'à la tige
 * verticale, puis un point rond plein sous un blanc.
 */
const QUESTION = {
  /** Trait du glyphe, plus appuyé que celui du cube : un glyphe fin se lit mal à cette taille. */
  width: 1.6,
  center: at(10, 6.6),
  radius: 4,
  /** Début et fin du crochet : à gauche un peu au-dessus du centre, puis en bas à droite. */
  from: (195 * Math.PI) / 180,
  to: (390 * Math.PI) / 180,
  /** Bas de la tige, centre et rayon du point. */
  stem: 13,
  dot: at(10, 16.4),
  dotRadius: 1.2,
} as const;

function questionPaths(): { stroke: Point[]; dot: Point[] } {
  const { center, radius, from, to, stem, dot, dotRadius } = QUESTION;
  const hook = Array.from({ length: 24 }, (_, i) => onCircle(center, radius, from + ((to - from) * i) / 23));
  const end = hook[hook.length - 1]!;
  // Première poignée dans la tangente de l'arc à sa fin : la courbe le prolonge sans angle ; la seconde à la verticale
  // de la tige : elle y arrive droite.
  const tangent = at(-Math.sin(to), Math.cos(to));
  const neck = bezier(end, at(end.x + 2 * tangent.x, end.y + 2 * tangent.y), at(10, 10.4), at(10, 12), 10);
  return {
    stroke: [...hook, ...neck.slice(1), at(10, stem)],
    // Cercle de rayon moitié, tracé d'un trait de la largeur du rayon : un disque plein, dans l'ordre des traits
    // (un remplissage passerait sous le fond du post-it).
    dot: Array.from({ length: 16 }, (_, i) => onCircle(dot, dotRadius / 2, (i * Math.PI) / 8)),
  };
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
  const place = (points: Point[]) => points.map((p) => at(x + p.x, y + p.y));
  const stroke = (points: Point[], width: number, closed = false) => {
    const mesh = strokeMesh(place(points), color, PIVOT_MARK.opacity, { width, closed });
    if (mesh) group.add(mesh);
  };
  if (kind === 'spread') for (const path of spreadPaths()) stroke(path.points, 1, !!path.closed);
  else {
    const question = questionPaths();
    stroke(question.stroke, QUESTION.width);
    stroke(question.dot, QUESTION.dotRadius, true);
  }
  return group;
}
