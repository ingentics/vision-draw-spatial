import { describe, expect, it } from 'vitest';
import { ModeSimulator } from '../../../../src/engine/core/modes/modeSimulator';
import type { InputCapture, PageTakeover } from '../../../../src/engine/core/modes/pageTakeover';

/** Simulateur minimal : ouvre, puis un pas par `step`. */
class Probe extends ModeSimulator {
  constructor(takeover: PageTakeover) {
    super(takeover);
  }
  open(input: InputCapture): boolean {
    return this.start(input);
  }
  step(): void {
    this.notify();
  }
}

/** Prise en main factice : un verrou à la fois, rendu par `release` (appelle `released`). */
function takeover(free = true) {
  const state = { cleared: [] as object[], capture: undefined as InputCapture | undefined };
  const takeover = {
    lockEditing: (owner: object, released?: () => void) =>
      free
        ? { owner, pageId: 'p', release: () => released?.(), captureInput: (c: InputCapture) => (state.capture = c) }
        : undefined,
    clearOverlay: (owner: object) => state.cleared.push(owner),
  } as unknown as PageTakeover;
  return { takeover, state };
}

describe('base des simulateurs des modes (sujet 535)', () => {
  it('ouverte : verrou pris, entrées capturées, abonnés prévenus à chaque pas et à la fermeture', () => {
    const { takeover: t, state } = takeover();
    const probe = new Probe(t);
    const input = { key: () => true };
    expect(probe.open(input)).toBe(true);
    expect(state.capture).toBe(input);
    expect(probe.opened).toBe(true);
    let seen = 0;
    const unsubscribe = probe.subscribe(() => seen++);
    probe.step();
    expect([seen, probe.version]).toEqual([1, 1]);
    probe.stop();
    expect(probe.opened).toBe(false);
    expect(state.cleared).toEqual([probe]);
    expect(seen).toBe(2);
    unsubscribe();
    probe.step();
    expect(seen).toBe(2);
  });

  it('verrou déjà pris ailleurs : pas ouverte', () => {
    const probe = new Probe(takeover(false).takeover);
    expect(probe.open({})).toBe(false);
    expect(probe.opened).toBe(false);
  });
});
