import { Color, Group } from 'three';
import { fillMesh, PART_ORDER, strokeMesh } from '../../../../core/plugins';
import type { Point, Rect } from '../../../../core/plugins';

/**
 * Pastille en haut à gauche d'un post-it (sujet 519) : triangle jaune marqué « ! » quand le mur donne un avertissement
 * sur lui, disque bleu marqué « ? » quand son pivot est « Je ne sais pas ». Les fonds passent au-dessus du papier
 * (`PART_ORDER.fill` + 0,6, comme les marques des champs RDD), les traits au-dessus des fonds.
 */
export const STICKY_BADGE = {
  /** Carré de la pastille, et retrait depuis les bords haut et gauche du post-it. */
  size: 20,
  inset: 7,
  /** Écart laissé entre la pastille et le label du type. */
  gap: 3,
  warningFill: '#ffd54f',
  questionFill: '#42a5f5',
} as const;

export type StickyBadgeKind = 'warning' | 'question';

const at = (x: number, y: number): Point => ({ x, y });

/** Point du cercle de centre `c` et de rayon `r`, à l'angle `angle` (y vers le bas : π/2 en bas). */
const onCircle = (c: Point, r: number, angle: number): Point =>
  at(c.x + r * Math.cos(angle), c.y + r * Math.sin(angle));

const circle = (c: Point, r: number, steps = 32): Point[] =>
  Array.from({ length: steps }, (_, i) => onCircle(c, r, (2 * Math.PI * i) / steps));

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
 * Point d'interrogation (repris du sujet 517) dans un carré de 20, de 2,6 à 17,6 : crochet en arc de cercle (rayon 4),
 * prolongé sans cassure par une courbe jusqu'à la tige verticale ; le point rond est dessiné à part (`QUESTION.dot`).
 */
const QUESTION = {
  width: 1.6,
  center: at(10, 6.6),
  radius: 4,
  /** Début et fin du crochet : à gauche un peu au-dessus du centre, puis en bas à droite. */
  from: (195 * Math.PI) / 180,
  to: (390 * Math.PI) / 180,
  stem: 13,
  dot: at(10, 16.4),
  dotRadius: 1.2,
} as const;

function questionStroke(): Point[] {
  const { center, radius, from, to, stem } = QUESTION;
  const hook = Array.from({ length: 24 }, (_, i) => onCircle(center, radius, from + ((to - from) * i) / 23));
  const end = hook[hook.length - 1]!;
  // Première poignée dans la tangente de l'arc à sa fin : la courbe le prolonge sans angle ; la seconde à la verticale
  // de la tige : elle y arrive droite.
  const tangent = at(-Math.sin(to), Math.cos(to));
  const neck = bezier(end, at(end.x + 2 * tangent.x, end.y + 2 * tangent.y), at(10, 10.4), at(10, 12), 10);
  return [...hook, ...neck.slice(1), at(10, stem)];
}

/** Carré de la pastille en haut à gauche de `bounds`. */
export function stickyBadgeRect(bounds: Rect): Rect {
  const { size, inset } = STICKY_BADGE;
  return { x: bounds.x + inset, y: bounds.y + inset, width: size, height: size };
}

/** Pastille `kind` en haut à gauche de `bounds`. */
export function stickyBadge(kind: StickyBadgeKind, bounds: Rect): Group {
  const { x, y } = stickyBadgeRect(bounds);
  const group = new Group();
  group.name = `sticky-badge:${kind}`;
  // `scale` : le glyphe réduit autour du centre du carré (le « ? » de 15 de haut tient dans le disque).
  const place = (points: Point[], scale = 1) =>
    points.map((p) => at(x + 10 + (p.x - 10) * scale, y + 10 + (p.y - 10) * scale));
  const fill = (points: Point[], color: string, order: number) => {
    const mesh = fillMesh(points, new Color(color), 1);
    mesh.renderOrder = order;
    group.add(mesh);
  };
  const stroke = (points: Point[], color: string, opacity: number, width: number, closed = false) => {
    const mesh = strokeMesh(points, new Color(color), opacity, { width, closed });
    if (mesh) {
      mesh.renderOrder = PART_ORDER.stroke + 1;
      group.add(mesh);
    }
  };
  if (kind === 'warning') {
    const triangle = place([at(10, 1.5), at(19.5, 18), at(0.5, 18)]);
    fill(triangle, STICKY_BADGE.warningFill, PART_ORDER.fill + 0.6);
    stroke(triangle, '#000000', 0.8, 1.2, true);
    stroke(place([at(10, 7), at(10, 12.6)]), '#000000', 0.9, 2);
    fill(place(circle(at(10, 15.3), 1.2, 16)), '#000000', PART_ORDER.fill + 0.7);
  } else {
    fill(place(circle(at(10, 10), 10)), STICKY_BADGE.questionFill, PART_ORDER.fill + 0.6);
    const scale = 0.72;
    stroke(place(questionStroke(), scale), '#ffffff', 1, QUESTION.width);
    fill(place(circle(QUESTION.dot, QUESTION.dotRadius, 16), scale), '#ffffff', PART_ORDER.fill + 0.7);
  }
  return group;
}
