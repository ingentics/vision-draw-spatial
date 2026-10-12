import type { Point, Rect } from '../../../../../core/plugins';

/**
 * Marques en coin d'un post-it (sujets 516, 519) : pastille en haut à gauche (`warnings/stickyBadge.ts`), icône du
 * pivot en haut à droite (`pivot/pivotMark.ts`). Un carré de 20, en retrait de 7 des bords, dont le tracé est écrit en
 * coordonnées de ce carré.
 */
export const CORNER_MARK = {
  /** Carré de la marque, et retrait depuis les bords du post-it. */
  size: 20,
  inset: 7,
  /** Écart laissé entre la marque et le label du type. */
  gap: 3,
} as const;

/** Point d'un tracé, en coordonnées du carré de la marque. */
export const at = (x: number, y: number): Point => ({ x, y });

/** Carré de la marque dans le coin haut gauche ou haut droit de `bounds`. */
export function cornerMarkRect(bounds: Rect, corner: 'left' | 'right'): Rect {
  const { size, inset } = CORNER_MARK;
  const x = corner === 'left' ? bounds.x + inset : bounds.x + bounds.width - inset - size;
  return { x, y: bounds.y + inset, width: size, height: size };
}
