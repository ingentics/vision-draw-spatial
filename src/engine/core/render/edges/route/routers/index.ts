import { EDGE_STYLES, routingKind } from '../routingKind';
import { isBlockArrow } from '../../blockArrow';
import { constraintFromStyle } from '../terminals';
import type { RouteInput, RoutingKind } from '../types';
import { elbowConnector, sideToSide, topToBottom } from './elbow';
import { entityRelation } from './entityRelation';
import { loopConnector } from './loop';
import { orthConnector } from './orthogonal';
import { segmentConnector } from './segment';
import type { Router } from './state';

/** Routeurs de draw.io (`mxEdgeStyle`) : choix du routeur d'une arête. */

const ROUTERS: Record<Exclude<RoutingKind, 'straight'>, Router> = {
  orthogonal: orthConnector,
  segment: segmentConnector,
  elbow: elbowConnector,
  sideToSide,
  topToBottom,
  entityRelation,
  loop: loopConnector,
};

export function edgeRouter(input: RouteInput): Router | undefined {
  const { source, target, style, waypoints } = input;
  // Flèche pleine (sujet 410) : toujours droite, même reliée à sa propre forme.
  if (isBlockArrow(style)) return undefined;
  // Boucle (mxGraphView.isLoopStyleEnabled) : une forme reliée à elle-même, sans tracé imposé.
  const sameTerminal = !!source && !!target && (source.id !== undefined ? source.id === target.id : source === target);
  const constrained =
    constraintFromStyle(style, 'exit') !== undefined || constraintFromStyle(style, 'entry') !== undefined;
  if (sameTerminal && waypoints.length < 2 && (style.orthogonalLoop !== '1' || !constrained)) {
    const loop = style.loop ? ROUTERS[EDGE_STYLES[style.loop] ?? 'loop'] : loopConnector;
    return loop ?? loopConnector;
  }
  const { kind } = routingKind(style);
  return kind === 'straight' ? undefined : ROUTERS[kind];
}
