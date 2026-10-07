import type { Point, Rect } from '../../../../model/types';
import type { Terminal } from '../types';
import { number } from '../util';

/** Ce que voient les routeurs : formes (`mxCellState`), vue, côtés autorisés (`portConstraint`). */

/** Forme vue par un routeur (mxCellState) ; une extrémité libre est un état de taille nulle, sans style. */
export interface State extends Rect {
  style?: Record<string, string>;
  id?: string;
}

/** Bouts fixes connus avant le routage (`state.absolutePoints`). */
export interface Fixed {
  p0?: Point;
  pe?: Point;
}

export type Router = (
  view: View,
  fixed: Fixed,
  source: State | undefined,
  target: State | undefined,
  points: Point[],
  result: Array<Point | null>,
) => void;

/** Ce que les routeurs lisent de la vue et du style de l'arête. */
export class View {
  constructor(readonly style: Record<string, string>) {}

  routingCenterX(state: State): number {
    return state.x + state.width / 2 + number(state.style?.routingCenterX, 0) * state.width;
  }

  routingCenterY(state: State): number {
    return state.y + state.height / 2 + number(state.style?.routingCenterY, 0) * state.height;
  }
}

export function stateOf(terminal: Terminal): State {
  return { ...terminal.bounds, style: terminal.style, id: terminal.id };
}

export function freeState(p: Point): State {
  return { x: p.x, y: p.y, width: 0, height: 0 };
}

export const WEST = 1;

export const NORTH = 2;

export const SOUTH = 4;

export const EAST = 8;

export const ALL = 15;

export const r10 = (v: number) => Math.round(v * 10) / 10;

export const scaled = (s: State | undefined): State | undefined =>
  s && { ...s, x: r10(s.x), y: r10(s.y), width: r10(s.width), height: r10(s.height) };

export const scaledPoint = (p: Point | undefined): Point | undefined => p && { x: r10(p.x), y: r10(p.y) };

export function contains(s: State, x: number, y: number): boolean {
  return s.x <= x && s.x + s.width >= x && s.y <= y && s.y + s.height >= y;
}

/** Côtés autorisés d'une forme (`portConstraint` de la forme, sinon `sourcePortConstraint` de l'arête). */
export function portConstraints(
  state: State,
  style: Record<string, string>,
  isSource: boolean,
  fallback: number,
): number {
  const value = state.style?.portConstraint ?? style[isSource ? 'sourcePortConstraint' : 'targetPortConstraint'];
  if (value === undefined) return fallback;
  let mask = 0;
  if (value.includes('north')) mask |= NORTH;
  if (value.includes('west')) mask |= WEST;
  if (value.includes('south')) mask |= SOUTH;
  if (value.includes('east')) mask |= EAST;
  return mask;
}
