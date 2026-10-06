import type { Point } from '../../../model/types';
import { perimeterBounds, perimeterPoint } from './perimeters';
import { stateOf, View } from './routers/state';
import type { Constraint, Terminal } from './types';

/** Bouts de l'arête : points d'attache imposés (`exitX`, `entryX`…) et centre de routage des formes. */

export function perimeterOn(style: Record<string, string>, prefix: 'exit' | 'entry'): boolean {
  return style[`${prefix}Perimeter`] !== '0';
}

/** Bout fixe : point d'attache imposé (projeté sur le contour, sauf `exitPerimeter=0`), ou extrémité libre. */
export function fixedTerminalPoint(
  terminal: Terminal | undefined,
  constraint: Constraint | undefined,
  free: Point | undefined,
  onPerimeter: boolean,
): Point | undefined {
  if (terminal && constraint) {
    const b = perimeterBounds(terminal, 0);
    const point = { x: b.x + constraint.x * b.width + constraint.dx, y: b.y + constraint.y * b.height + constraint.dy };
    if (onPerimeter) return perimeterPoint(terminal, point, false, 0);
    // Sans projection, le point suit les retournements de la forme.
    if (terminal.style?.flipH === '1') point.x = 2 * (b.x + b.width / 2) - point.x;
    if (terminal.style?.flipV === '1') point.y = 2 * (b.y + b.height / 2) - point.y;
    return point;
  }
  return terminal ? undefined : free && { ...free };
}

/** Point d'attache imposé d'un bout, s'il y en a un. */
export function fixedAnchor(
  terminal: Terminal,
  style: Record<string, string>,
  end: 'source' | 'target',
): Point | undefined {
  const prefix = end === 'source' ? 'exit' : 'entry';
  return fixedTerminalPoint(terminal, constraintFromStyle(style, prefix), undefined, perimeterOn(style, prefix));
}

/** Centre de routage d'une forme (`routingCenterX/Y`). */
export function routingCenter(terminal: Terminal): Point {
  const view = new View({});
  const state = stateOf(terminal);
  return { x: view.routingCenterX(state), y: view.routingCenterY(state) };
}

export function constraintFromStyle(style: Record<string, string>, prefix: 'exit' | 'entry'): Constraint | undefined {
  if (style[`${prefix}X`] === undefined || style[`${prefix}Y`] === undefined) return undefined;
  const num = (key: string) => {
    const value = parseFloat(style[key] ?? '');
    return Number.isFinite(value) ? value : 0;
  };
  return { x: num(`${prefix}X`), y: num(`${prefix}Y`), dx: num(`${prefix}Dx`), dy: num(`${prefix}Dy`) };
}
