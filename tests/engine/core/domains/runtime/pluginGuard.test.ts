import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PluginGuard } from '../../../../../src/engine/core/domains/runtime/pluginGuard';

const fail = (): never => {
  throw new Error('panne');
};

/** Rapporteur sur un cœur réduit ; `published` compte les republications des Diagnostics. */
function setup() {
  const state = { published: 0 };
  const core = { file: { publishWarnings: () => state.published++ } } as unknown as EngineCore;
  return { guard: new PluginGuard(core), state };
}

describe('rapporteur des erreurs des plugins (sujets 288, 378)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('appel protégé : repli, erreur signalée une fois par plugin et point d’entrée, Diagnostics republiés une fois', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { guard, state } = setup();
    expect(guard.call('Mode', 'rdd', 'dressing', 'repli', fail)).toBe('repli');
    expect(guard.call('Mode', 'rdd', 'dressing', 'repli', fail)).toBe('repli');
    guard.reporter('Effet', 'forest', 'volume', new Error('décor'));
    expect(guard.call('Forme', 'rectangle', 'outline', 0, () => 3)).toBe(3);
    expect(guard.warnings()).toEqual([
      { message: 'Mode rdd : erreur dans dressing (panne)', level: 'error' },
      { message: 'Effet forest : erreur dans volume (décor)', level: 'error' },
    ]);
    expect(guard.owns(guard.warnings()[0]!)).toBe(true);
    await Promise.resolve();
    expect(state.published).toBe(1);
  });
});
