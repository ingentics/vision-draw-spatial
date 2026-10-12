import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { LayerSpreads } from '../../../../../src/engine/core/domains/view/layerSpreads';

// Sujet 526 : calques aplatis ou étendus, état de session par page.

function setup() {
  const state = { events: [] as unknown[][], rebuilt: [] as unknown[], interactive: true };
  const core = {
    canInteract: () => state.interactive,
    events: { emit: (...args: unknown[]) => state.events.push(args) },
    scenes: { current: undefined },
    settings: { view: { switchDurationMs: 450 } },
    config: { reducedMotion: () => false },
    levels: { rebuildScenes: (ids: unknown) => state.rebuilt.push(ids) },
  } as unknown as EngineCore;
  return { spreads: new LayerSpreads(core), state };
}

describe('calques aplatis (sujet 526)', () => {
  it('étendus par défaut ; aplatir change la part appliquée, prévient l’appli et reconstruit la page', () => {
    const { spreads, state } = setup();
    expect(spreads.spreadOf('p')).toBe(1);
    spreads.setLayersFlattened('p', true);
    expect(spreads.layersFlattened('p')).toBe(true);
    expect(spreads.spreadOf('p')).toBe(0);
    expect(spreads.spreadOf('q')).toBe(1);
    expect(state.events).toEqual([['layerChange', 'p']]);
    // Pas de scène en volume affichée : pas d'animation, la page est reconstruite tout de suite.
    expect(state.rebuilt).toEqual([['p']]);
  });

  it('rien si l’état ne change pas ; nouveau document : tout étendu', () => {
    const { spreads, state } = setup();
    spreads.setLayersFlattened('p', false);
    expect(state.events).toEqual([]);
    spreads.setLayersFlattened('p', true);
    spreads.resetDocument();
    expect(spreads.layersFlattened('p')).toBe(false);
  });

  it('rien pendant une transition de vue, comme la vue à plat (sujet 544)', () => {
    const { spreads, state } = setup();
    state.interactive = false;
    spreads.setLayersFlattened('p', true);
    expect(spreads.layersFlattened('p')).toBe(false);
    expect(state.events).toEqual([]);
  });
});
