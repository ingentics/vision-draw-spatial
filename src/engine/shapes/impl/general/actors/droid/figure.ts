import type { Point } from '../../../../../model/types';
import { ellipsePath, roundedPolygon } from '../../../../../render/geometry/paths';
import { actorBody } from '../common/figure';
import type { ActorFigure } from '../common/figure';

/** Cadre de dessin du droid (celui du stencil draw.io) : tout s'étire avec la forme, comme un stencil. */
export const DROID_W = 30;
export const DROID_H = 60;

/**
 * Tête de droid de combat, simplifiée : allongée, dessus arrondi, plus large aux yeux, museau qui se rétrécit
 * jusqu'au cou (quart du haut, comme l'Actor). Coins arrondis de `HEAD_ARC`.
 */
const HEAD_OUTLINE: Point[] = [
  { x: 11.5, y: 1.5 },
  { x: 18.5, y: 1.5 },
  { x: 20, y: 6 },
  { x: 19, y: 10 },
  { x: 17, y: 15 },
  { x: 13, y: 15 },
  { x: 11, y: 10 },
  { x: 10, y: 6 },
];
const HEAD_ARC = 1.5;
/**
 * Antenne : part du côté droit du visage, à hauteur des yeux, s'en écarte un peu puis monte au-dessus de la tête,
 * jusqu'à un embout allongé en haut du cadre.
 */
const ANTENNA_BASE = { x: 19.8, y: 7 };
const TIP = { x: 21, y: 0, width: 1.6, height: 3.5 };
const TIP_SEGMENTS = 24;
const ANTENNA_X = TIP.x + TIP.width / 2;

/** Droid dans le cadre du stencil, avant étirement : la source du stencil draw.io (`./index.ts`). */
export const DROID_FRAME: ActorFigure = {
  head: { x: 10, y: 1.5, width: 10, height: 13.5 },
  parts: [roundedPolygon(HEAD_OUTLINE, HEAD_ARC), ellipsePath(TIP, TIP_SEGMENTS)],
  strokes: [
    ...actorBody(DROID_W, DROID_H),
    [ANTENNA_BASE, { x: ANTENNA_X, y: ANTENNA_BASE.y }, { x: ANTENNA_X, y: TIP.y + TIP.height }],
  ],
};

/** Droid : le corps de l'Actor, une tête de droid de combat et une antenne à droite, étiré dans `w` × `h`. */
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
