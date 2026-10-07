import type { Point, Rect } from '../../../../../core/model/types';

/**
 * Silhouette d'un acteur dans un cadre `w` × `h` (y vers le bas) : le bonhomme de draw.io
 * (`UmlActorShape.paintBackground`), dont chaque variante change la tête.
 */
export interface ActorFigure {
  /** Cadre de la tête : la sélection l'entoure en iso / 3D. */
  head: Rect;
  /** Pièces remplies de la couleur de fond et bordées, contours fermés : la tête d'abord. */
  parts: Point[][];
  /** Corps, bras (`ARMS`), jambes, puis les traits propres à la variante : lignes brisées tracées avec la bordure. */
  strokes: Point[][];
}

/** Silhouette d'une variante, à la taille demandée. */
export type FigureOf = (w: number, h: number) => ActorFigure;

/** Rang des bras dans `ActorFigure.strokes` : la pancarte les tend jusqu'à ses bords. */
export const ARMS = 1;

/** Corps, bras et jambes du bonhomme de draw.io : cou au quart du haut, épaules au tiers, hanches aux deux tiers. */
export function actorBody(w: number, h: number): Point[][] {
  const neck = { x: w / 2, y: h / 4 };
  const shoulders = h / 3;
  const hips = { x: w / 2, y: (2 * h) / 3 };
  return [
    [neck, hips],
    [
      { x: 0, y: shoulders },
      { x: w, y: shoulders },
    ],
    [{ x: 0, y: h }, hips, { x: w, y: h }],
  ];
}
