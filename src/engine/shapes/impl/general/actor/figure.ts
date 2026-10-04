import type { Point, Rect } from '../../../../model/types';

/** Bonhomme de draw.io (`UmlActorShape.paintBackground`) dans un cadre `w` × `h` : tête et traits du corps. */
export interface ActorFigure {
  /** Tête : ellipse remplie de la couleur de fond, sur le quart du haut. */
  head: Rect;
  /** Corps, bras et jambes : lignes brisées tracées avec la bordure. */
  strokes: Point[][];
}

export function actorFigure(w: number, h: number): ActorFigure {
  const neck = { x: w / 2, y: h / 4 };
  const shoulders = h / 3;
  const hips = { x: w / 2, y: (2 * h) / 3 };
  return {
    head: { x: w / 4, y: 0, width: w / 2, height: h / 4 },
    strokes: [
      [neck, hips],
      [
        { x: 0, y: shoulders },
        { x: w, y: shoulders },
      ],
      [{ x: 0, y: h }, hips, { x: w, y: h }],
    ],
  };
}
