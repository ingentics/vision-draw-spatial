import type { Point } from '../../model/types';
import { direction, distance } from '../../model/geometry';

/**
 * Flèche pleine (« block arrow » de Miro, sujet 410) : une arête `shape=flexArrow`, toujours droite de la queue à la
 * pointe, dessinée comme un seul polygone rempli. draw.io la lit comme sa flèche épaisse : le fichier s'ouvre, le
 * rendu n'a pas à y être identique (sujet 408).
 */

/** Valeur de `shape` d'une flèche pleine. */
export const BLOCK_ARROW_SHAPE = 'flexArrow';

export function isBlockArrow(style: Record<string, string>): boolean {
  return style.shape === BLOCK_ARROW_SHAPE;
}

/**
 * Proportions pour une flèche de 100 px : demi-largeurs de la queue, du corps à la base de la tête et de la tête,
 * longueur de la tête, et recul des barbes (base de la tête creusée). Tout suit la longueur : étirée, la flèche
 * garde sa silhouette.
 */
const REFERENCE_LENGTH = 100;
const TAIL_HALF = 1;
const BODY_HALF = 6;
const HEAD_HALF = 14;
const HEAD_LENGTH = 24;
const BARB_SWEEP = 4;

/**
 * Contour de la flèche pleine de `tail` à `tip` (sens horaire en coordonnées page), vide si les bouts sont confondus.
 * `margin` (pixels de page) l'agrandit d'autant tout autour en gardant sa silhouette (trou du voile de sélection) :
 * largeurs élargies, queue reculée, pointe avancée selon l'angle de la tête pour rester à `margin` de ses côtés.
 */
export function blockArrowOutline(tail: Point, tip: Point, margin = 0): Point[] {
  const length = distance(tail, tip);
  if (length === 0) return [];
  const k = length / REFERENCE_LENGTH;
  const u = direction(tail, tip);
  // `along` et `side` à l'échelle de la flèche, `extraAlong` et `extraSide` de la marge (non mis à l'échelle).
  const at = (along: number, side: number, extraAlong = 0, extraSide = 0): Point => {
    const a = along * k + extraAlong * margin;
    const n = side * k + Math.sign(side) * extraSide * margin;
    return { x: tail.x + u.x * a - u.y * n, y: tail.y + u.y * a + u.x * n };
  };
  const neck = REFERENCE_LENGTH - HEAD_LENGTH;
  // Pointe : à `margin` de chaque côté de la tête, elle avance de `margin / sin(demi-angle)`.
  const tipAdvance = Math.hypot(HEAD_LENGTH + BARB_SWEEP, HEAD_HALF) / HEAD_HALF;
  return [
    at(0, -TAIL_HALF, -1, 1),
    at(neck, -BODY_HALF, 0, 1),
    at(neck - BARB_SWEEP, -HEAD_HALF, -1, 1),
    at(REFERENCE_LENGTH, 0, tipAdvance),
    at(neck - BARB_SWEEP, HEAD_HALF, -1, 1),
    at(neck, BODY_HALF, 0, 1),
    at(0, TAIL_HALF, -1, 1),
  ];
}
