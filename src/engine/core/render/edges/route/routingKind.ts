import type { RoutingKind } from './types';

/** Style de routage d'une arête (`edgeStyle` de draw.io). */

export const EDGE_STYLES: Record<string, Exclude<RoutingKind, 'straight'>> = {
  orthogonalEdgeStyle: 'orthogonal',
  segmentEdgeStyle: 'segment',
  elbowEdgeStyle: 'elbow',
  sideToSideEdgeStyle: 'sideToSide',
  topToBottomEdgeStyle: 'topToBottom',
  entityRelationEdgeStyle: 'entityRelation',
  loopEdgeStyle: 'loop',
};

/** Style de routage effectif ; `supported` est faux si on a dû se rabattre sur l'orthogonal. */
export function routingKind(style: Record<string, string>): { kind: RoutingKind; supported: boolean } {
  const edgeStyle = style.edgeStyle;
  if (edgeStyle === undefined || edgeStyle === '' || edgeStyle === 'none' || style.noEdgeStyle === '1')
    return { kind: 'straight', supported: true };
  const kind = EDGE_STYLES[edgeStyle];
  return kind ? { kind, supported: true } : { kind: 'orthogonal', supported: false };
}
