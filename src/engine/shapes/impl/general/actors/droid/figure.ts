import type { Point } from '../../../../../model/types';
import { ellipsePath, roundedRectPath } from '../../../../../render/geometry/paths';
import { actorBody } from '../common/figure';
import type { ActorFigure } from '../common/figure';

/** Cadre de dessin du droid (celui du stencil draw.io) : tout s'étire avec la forme, comme un stencil. */
export const DROID_W = 30;
export const DROID_H = 60;

/** Tête : rectangle arrondi plus large que haut, posé sur le cou (quart du haut, comme l'Actor). */
const HEAD = { x: 7.5, y: 5, width: 15, height: 10 };
const HEAD_RADIUS = 3;
/** Antenne : boule en haut du cadre, tige jusqu'à la tête. */
const BALL = { x: 13.75, y: 0, width: 2.5, height: 2.5 };
const BALL_SEGMENTS = 24;

/** Droid dans le cadre du stencil, avant étirement : la source du stencil draw.io (`./index.ts`). */
export const DROID_FRAME: ActorFigure = {
  head: HEAD,
  parts: [roundedRectPath(HEAD, HEAD_RADIUS), ellipsePath(BALL, BALL_SEGMENTS)],
  strokes: [
    ...actorBody(DROID_W, DROID_H),
    [
      { x: DROID_W / 2, y: BALL.y + BALL.height },
      { x: DROID_W / 2, y: HEAD.y },
    ],
  ],
};

/** Droid : le corps de l'Actor, une tête de robot surmontée d'une petite antenne, étiré dans `w` × `h`. */
export function droidFigure(w: number, h: number): ActorFigure {
  const sx = w / DROID_W;
  const sy = h / DROID_H;
  const at = (p: Point): Point => ({ x: p.x * sx, y: p.y * sy });
  const { head } = DROID_FRAME;
  return {
    head: { x: head.x * sx, y: head.y * sy, width: head.width * sx, height: head.height * sy },
    parts: DROID_FRAME.parts.map((part) => part.map(at)),
    strokes: DROID_FRAME.strokes.map((line) => line.map(at)),
  };
}
