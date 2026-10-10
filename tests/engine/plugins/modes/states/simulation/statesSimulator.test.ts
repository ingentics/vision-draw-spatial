import { describe, expect, it, vi } from 'vitest';
import type { EditLock, InputCapture, PageOverlay, PageTakeover } from '../../../../../../src/engine/core/plugins';
import { StateSimulation } from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import { StatesSimulator } from '../../../../../../src/engine/plugins/modes/states/simulation/statesSimulator';
import { setup } from '../helpers';

/** Briques du moteur réduites : verrou (refusé si `refuse`), capture, couche et caméra notées. */
function takeover(refuse = false) {
  const state: {
    capture?: InputCapture;
    released?: () => void;
    overlay?: PageOverlay;
    kept: string[];
    lockReleased: number;
  } = { kept: [], lockReleased: 0 };
  const stage: PageTakeover = {
    lockEditing: (owner, released) => {
      if (refuse) return undefined;
      state.released = released;
      const lock: EditLock = {
        owner,
        pageId: 'p',
        release: () => {
          state.lockReleased++;
          released?.();
        },
        captureInput: (capture) => {
          state.capture = capture;
        },
      };
      return lock;
    },
    setOverlay: (_owner, overlay) => {
      state.overlay = overlay;
    },
    clearOverlay: () => {
      state.overlay = undefined;
    },
    keepInView: (id) => state.kept.push(id),
  };
  return { stage, state };
}

describe('mode Machine à états : simulation ouverte sur la page (sujet 467)', () => {
  it('ouverte : verrou pris, entrées capturées, couche du départ posée, état courant gardé dans la vue', () => {
    const { stage, state } = takeover();
    const simulator = StatesSimulator.open(stage, new StateSimulation(setup().page(), 'init1'))!;
    expect(simulator.opened).toBe(true);
    expect(state.capture).toBeDefined();
    expect(state.overlay?.veil?.kept).toEqual(['init1', 't1']);
    expect(state.kept).toEqual(['init1']);
  });

  it('refusée si l’édition ne peut pas être verrouillée', () => {
    expect(StatesSimulator.open(takeover(true).stage, new StateSimulation(setup().page(), 'init1'))).toBeUndefined();
  });

  it('touches et clics : un pas, suivi par l’appli ; une touche sans effet n’est pas prise', () => {
    const { stage, state } = takeover();
    const simulator = StatesSimulator.open(stage, new StateSimulation(setup().page(), 'init1'))!;
    const listener = vi.fn();
    simulator.subscribe(listener);
    expect(state.capture!.key!('2')).toBe(false);
    expect(state.capture!.key!('1')).toBe(true);
    expect(simulator.sim.current.id).toBe('state1');
    expect(state.capture!.clickable!('t4')).toBe(true);
    state.capture!.click!('t4');
    expect(simulator.sim.current.id).toBe('s4');
    expect(listener).toHaveBeenCalledTimes(2);
    expect(state.kept.at(-1)).toBe('s4');
  });

  it('Échap arrête : verrou rendu, couche retirée ; plus aucun pas ensuite', () => {
    const { stage, state } = takeover();
    const simulator = StatesSimulator.open(stage, new StateSimulation(setup().page(), 'init1'))!;
    expect(state.capture!.key!('Escape')).toBe(true);
    expect(simulator.opened).toBe(false);
    expect(state.lockReleased).toBe(1);
    expect(state.overlay).toBeUndefined();
    simulator.choose(1);
    expect(simulator.sim.current.id).toBe('init1');
  });

  it('verrou rendu par le moteur (autre page, autre document) : fermée, couche retirée', () => {
    const { stage, state } = takeover();
    const simulator = StatesSimulator.open(stage, new StateSimulation(setup().page(), 'init1'))!;
    state.released!();
    expect(simulator.opened).toBe(false);
    expect(state.overlay).toBeUndefined();
  });
});
