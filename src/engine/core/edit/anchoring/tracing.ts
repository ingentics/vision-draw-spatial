import type { ShapeSettings } from '../../settings/types';
import type { Anchoring } from './mode';
import { octilinearRouter } from './pcb/octilinear';
import type { AvoidOptions, Router } from './routing';

/**
 * Tracé des flèches d'un ancrage, lu dans les réglages : l'automatique et le Typon ont les mêmes réglages, ceux du
 * Typon préfixés `edgePcb…` (`shapes.edgeShapeClearance` / `shapes.edgePcbShapeClearance`…).
 */

const PREFIX = { auto: 'edge', pcb: 'edgePcb' } as const;

/**
 * Tracé d'un ancrage : en automatique (et en manuel), orthogonal, sans tracé si le contournement est coupé
 * (`shapes.edgeAutoRoute`) ; en Typon, avec ses propres réglages, toujours octilinéaire, direct si le contournement
 * est coupé.
 */
export function tracingOf(shapes: ShapeSettings, anchoring: Anchoring): { route?: AvoidOptions; router?: Router } {
  const prefix = PREFIX[anchoring === 'pcb' ? 'pcb' : 'auto'];
  const route: AvoidOptions = {
    clearance: shapes[`${prefix}ShapeClearance`],
    spacing: shapes[`${prefix}Spacing`],
    stub: shapes[`${prefix}PortStub`],
    crossingDetour: shapes[`${prefix}CrossingDetour`],
  };
  const avoid = shapes[`${prefix}AutoRoute`];
  if (anchoring === 'pcb') {
    const bends = { diagonal: shapes.edgePcbBend45, right: shapes.edgePcbBend90 };
    return { route, router: octilinearRouter(avoid, bends) };
  }
  return avoid ? { route } : {};
}
