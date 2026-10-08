import { describe, expect, it, vi } from 'vitest';
import { ModifierKeys } from '../../../../../src/engine/core/domains/input/keys';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';

/** Touches de modification sur un cœur réduit à ce que `ModifierKeys` lit, sur la vue graphe ou une page. */
function setup() {
  const view = { graph: true };
  const setLinkZonesShown = vi.fn();
  const emit = vi.fn();
  const core = {
    graph: { isGraphView: () => view.graph },
    links: { setLinkZonesShown },
    selection: { current: undefined },
    events: { emit },
  } as unknown as EngineCore;
  return { keys: new ModifierKeys(core), view, setLinkZonesShown, emit };
}

describe('pas de mode navigation sur la vue graphe (sujet 364)', () => {
  it('touche pour suivre un lien maintenue sur la vue graphe : ni mode navigation, ni zones liées', () => {
    const { keys, setLinkZonesShown, emit } = setup();
    keys.setHeldKeys({ followLink: true, multiSelect: false });
    expect(keys.getModeHint()).toBeUndefined();
    expect(setLinkZonesShown).toHaveBeenLastCalledWith(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('touche toujours maintenue à l’arrivée sur une page : le mode navigation s’active', () => {
    const { keys, view, setLinkZonesShown, emit } = setup();
    keys.setHeldKeys({ followLink: true, multiSelect: false });
    view.graph = false;
    keys.refresh();
    expect(keys.getModeHint()).toBe('navigation');
    expect(setLinkZonesShown).toHaveBeenLastCalledWith(true);
    expect(emit).toHaveBeenLastCalledWith('modeHint', 'navigation');
  });

  it('en partant vers la vue graphe, touche maintenue : le mode navigation s’arrête', () => {
    const { keys, view, emit } = setup();
    view.graph = false;
    keys.setHeldKeys({ followLink: true, multiSelect: false });
    view.graph = true;
    keys.refresh();
    expect(emit).toHaveBeenLastCalledWith('modeHint', undefined);
  });
});
