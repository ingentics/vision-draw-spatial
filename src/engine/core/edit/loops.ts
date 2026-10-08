import type { Point, Rect } from '../model/types';
import type { Side } from './edgeEnds';

/**
 * Coudes d'une flèche qui boucle sur une même forme (SPEC §14.1). Le routeur de draw.io longe le bord quand les deux
 * bouts sont sur le même côté et traverse la forme quand ils sont sur des côtés opposés : la boucle reçoit donc ses
 * coudes en points intermédiaires, écrits dans le fichier (même rendu dans draw.io).
 */

/** Écart de la boucle au cadre de la forme, en pixels de page. */
export const LOOP_MARGIN = 20;

export interface LoopEnd {
  /** Point d'attache sur la page. */
  point: Point;
  side: Side;
}

const VERTICAL: ReadonlySet<Side> = new Set(['e', 'w']);

/**
 * Coudes d'une boucle, hors de la forme : même côté = U ; côtés voisins = par le coin ; côtés opposés = autour de
 * la forme, par le côté le plus proche des deux points.
 */
export function loopWaypoints(bounds: Rect, from: LoopEnd, to: LoopEnd, margin = LOOP_MARGIN): Point[] {
  const line: Record<Side, number> = {
    n: bounds.y - margin,
    s: bounds.y + bounds.height + margin,
    w: bounds.x - margin,
    e: bounds.x + bounds.width + margin,
  };
  const out = ({ point, side }: LoopEnd): Point =>
    VERTICAL.has(side) ? { x: line[side], y: point.y } : { x: point.x, y: line[side] };
  const corner = (a: Side, b: Side): Point =>
    VERTICAL.has(a) ? { x: line[a], y: line[b] } : { x: line[b], y: line[a] };

  let points: Point[];
  if (from.side === to.side) points = [out(from), out(to)];
  else if (VERTICAL.has(from.side) !== VERTICAL.has(to.side)) points = [out(from), corner(from.side, to.side), out(to)];
  else {
    const vertical = VERTICAL.has(from.side);
    const middle = vertical ? (from.point.y + to.point.y) / 2 : (from.point.x + to.point.x) / 2;
    const center = vertical ? bounds.y + bounds.height / 2 : bounds.x + bounds.width / 2;
    const via: Side = vertical ? (middle <= center ? 'n' : 's') : middle >= center ? 'e' : 'w';
    points = [out(from), corner(from.side, via), corner(via, to.side), out(to)];
  }
  return points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
}
