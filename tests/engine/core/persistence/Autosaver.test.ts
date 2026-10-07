import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Autosaver } from '../../../../src/engine/core/persistence/Autosaver';

describe('Autosaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const state = { pending: true, busy: false, saves: 0 };
    const saver = new Autosaver({
      delayMs: 1000,
      pending: () => state.pending,
      busy: () => state.busy,
      save: () => {
        state.saves++;
        state.pending = false;
      },
    });
    return { state, saver };
  };

  it('sauvegarde une fois, délai après la dernière modification', () => {
    const { state, saver } = setup();
    saver.changed();
    vi.advanceTimersByTime(600);
    saver.changed();
    vi.advanceTimersByTime(600);
    expect(state.saves).toBe(0);
    vi.advanceTimersByTime(400);
    expect(state.saves).toBe(1);
  });

  it('attend la fin d’un geste en cours', () => {
    const { state, saver } = setup();
    state.busy = true;
    saver.changed();
    vi.advanceTimersByTime(3000);
    expect(state.saves).toBe(0);
    state.busy = false;
    vi.advanceTimersByTime(1000);
    expect(state.saves).toBe(1);
  });

  it('rien à sauvegarder (ex. annulé jusqu’à l’état enregistré) : rien n’est écrit', () => {
    const { state, saver } = setup();
    saver.changed();
    state.pending = false;
    vi.advanceTimersByTime(2000);
    expect(state.saves).toBe(0);
  });

  it('flush : sauvegarde immédiate de ce qui attend ; cancel : abandon', () => {
    const { state, saver } = setup();
    saver.changed();
    saver.flush();
    expect(state.saves).toBe(1);
    saver.flush();
    expect(state.saves).toBe(1);
    state.pending = true;
    saver.changed();
    saver.cancel();
    vi.advanceTimersByTime(5000);
    expect(state.saves).toBe(1);
  });
});
