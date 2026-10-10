import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { SimulationScene } from '../../../../../../src/engine/core/modes/simulation';
import type { RenderContext } from '../../../../../../src/engine/core/render/types';
import { edgeBadgeDisc } from '../../../../../../src/engine/core/render/decorations';
import { simulationFrame } from '../../../../../../src/engine/plugins/modes/states/simulation/simulationLayer';
import { PROPOSED_BADGE } from '../../../../../../src/engine/plugins/modes/states/simulation/simulationMarks';
import { StateSimulation } from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import { stepLook } from '../../../../../../src/engine/plugins/modes/states/simulation/simulationView';
import { MEASURE } from '../../../../../helpers';
import { setup } from '../helpers';

/** Page dessinée réduite : tracés droits entre les centres, contours des emprises. */
function scene(sim: StateSimulation, reducedMotion = false): SimulationScene {
  const { page } = sim;
  const centerOf = (id: string | undefined) => {
    const b = page.shapes.find((s) => s.id === id)!.bounds;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  return {
    page,
    route: (id) => {
      const edge = page.edges.find((e) => e.id === id);
      return edge && [centerOf(edge.sourceId), centerOf(edge.targetId)];
    },
    outline: (id) => {
      const b = page.shapes.find((s) => s.id === id)?.bounds;
      return (
        b && [
          { x: b.x, y: b.y },
          { x: b.x + b.width, y: b.y },
          { x: b.x + b.width, y: b.y + b.height },
          { x: b.x, y: b.y + b.height },
        ]
      );
    },
    ctx: { ...MEASURE, text: { create: () => new Object3D() } } as unknown as RenderContext,
    reducedMotion,
  };
}

describe('mode Machine à états : couche de la simulation (sujet 462)', () => {
  it('garde net l’état courant, les transitions proposées et empruntées ; la caméra suit l’état courant', () => {
    const sim = new StateSimulation(setup().page(), 'init1');
    sim.choose(1);
    const frame = simulationFrame(sim);
    expect(frame.kept).toEqual(['state1', 't2', 't4', 't1']);
    expect(frame.follow).toBe('state1');
  });

  it('un clic sur la pastille d’une transition proposée la vise', () => {
    const sim = new StateSimulation(setup().page(), 'state1');
    const s = scene(sim);
    const layer = simulationFrame(sim).layer!(s)!;
    const t4 = sim.page.edges.find((e) => e.id === 't4')!;
    const disc = edgeBadgeDisc(t4, s.route('t4')!, PROPOSED_BADGE);
    expect(layer.hit!(disc.center)).toBe('t4');
    expect(layer.hit!({ x: -500, y: -500 })).toBeUndefined();
  });

  it('franchissement : le pas précédent et le point, puis le pas suivant ; immobile sans animation', () => {
    const sim = new StateSimulation(setup().page(), 'state1');
    const before = stepLook(sim);
    sim.cross('t2');
    const layer = simulationFrame(sim, { before, edgeId: 't2' }).layer!(scene(sim))!;
    const [after, previous] = layer.object.children;
    expect(previous!.visible).toBe(true);
    expect(after!.visible).toBe(false);
    expect(layer.object.children).toHaveLength(3);
    expect(layer.animate!(300)).toBe(true);
    expect(previous!.visible).toBe(false);
    expect(after!.visible).toBe(true);
    expect(layer.object.children).toHaveLength(2);
    const still = simulationFrame(sim, { before, edgeId: 't2' }).layer!(scene(sim, true))!;
    expect(still.animate).toBeUndefined();
    expect(still.object.children).toHaveLength(1);
  });
});
