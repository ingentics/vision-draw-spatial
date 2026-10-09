import type { Point } from '../../../model/types';
import { perimeterPoint } from './perimeters';
import { edgeRouter } from './routers';
import { stateOf, View } from './routers/state';
import { routingKind } from './routingKind';
import { isBlockArrow } from '../blockArrow';
import { simplify } from './simplify';
import { constraintFromStyle, fixedTerminalPoint, perimeterOn } from './terminals';
import type { RouteInput } from './types';
import { number } from './util';
import { center } from '../../../model/geometry';

/** Tracé d'une arête, en trois temps : bouts fixes, routeur, bouts flottants (`mxGraphView.updateEdgeState`). */

/** Tracé complet de l'arête, extrémités comprises. Vide si l'arête n'a pas deux extrémités. */
export function routeEdge(input: RouteInput): Point[] {
  return simplify(routeEdgePoints(input));
}

/**
 * Tracé brut, tel que draw.io le calcule (`state.absolutePoints`) : points alignés ou confondus compris.
 * C'est sur lui que travaillent les poignées des segments (`edit/edgePointEdits.ts`), comme dans draw.io.
 */
export function routeEdgePoints(input: RouteInput): Point[] {
  const { source, target, style } = input;
  const view = new View(style);

  // 1. Bouts fixes (mxGraphView.updateFixedTerminalPoints).
  const p0 = fixedTerminalPoint(
    source,
    constraintFromStyle(style, 'exit'),
    input.sourcePoint,
    perimeterOn(style, 'exit'),
  );
  const pe = fixedTerminalPoint(
    target,
    constraintFromStyle(style, 'entry'),
    input.targetPoint,
    perimeterOn(style, 'entry'),
  );

  // 2. Routeur (mxGraphView.updatePoints) : `result` commence par le premier bout, comme dans draw.io.
  const sourceState = source && stateOf(source);
  const targetState = target && stateOf(target);
  const router = edgeRouter(input);
  const result: Array<Point | null> = [p0 ?? null];
  // Flèche pleine (sujet 410) : droite d'un bout à l'autre, ses points intermédiaires éventuels sont ignorés.
  const waypoints = isBlockArrow(style) ? [] : input.waypoints;
  if (router) router(view, { p0, pe }, sourceState, targetState, waypoints, result);
  else for (const p of waypoints) result.push({ ...p });
  result.push(pe ?? null);

  // 3. Bouts flottants (mxGraphView.updateFloatingTerminalPoints) : la cible d'abord.
  // mxGraph.isOrthogonal : d'après `edgeStyle` seul (une boucle d'un style orthogonal l'est aussi).
  const orthogonal =
    style.orthogonal !== undefined ? style.orthogonal !== '0' : !['straight', 'loop'].includes(routingKind(style).kind);
  const spacing = number(style.perimeterSpacing, 0);
  if (result[result.length - 1] === null && target) {
    const next = result[result.length - 2] ?? (source ? center(source.bounds) : undefined);
    result[result.length - 1] = next
      ? perimeterPoint(target, next, orthogonal, spacing + number(style.targetPerimeterSpacing, 0))
      : null;
  }
  if (result[0] === null && source) {
    const next = result[1] ?? (target ? center(target.bounds) : undefined);
    result[0] = next
      ? perimeterPoint(source, next, orthogonal, spacing + number(style.sourcePerimeterSpacing, 0))
      : null;
  }
  if (result.some((p) => p === null) || result.length < 2) return [];
  return result as Point[];
}
