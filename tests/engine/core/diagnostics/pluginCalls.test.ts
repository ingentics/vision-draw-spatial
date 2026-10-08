import { afterEach, describe, expect, it, vi } from 'vitest';
import { callPlugin } from '../../../../src/engine/core/diagnostics/pluginCalls';

const fail = (): never => {
  throw new Error('panne');
};

describe('appel protégé d’un plugin (sujet 378)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sans exception : la valeur du point d’entrée, le repli n’est pas évalué', () => {
    const fallback = vi.fn(() => 0);
    const report = vi.fn();
    expect(callPlugin('Forme', 'rectangle', 'outline', fallback, () => 42, report)).toBe(42);
    expect(fallback).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('exception : le repli, l’erreur au rapporteur avec la famille, l’id et le point d’entrée', () => {
    const report = vi.fn();
    expect(callPlugin('Mode', 'rdd', 'dressing', () => 'repli', fail, report)).toBe('repli');
    expect(report).toHaveBeenCalledWith('Mode', 'rdd', 'dressing', expect.objectContaining({ message: 'panne' }));
  });

  it('sans rapporteur : le repli et la console, jamais d’exception qui remonte', () => {
    const console = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    expect(callPlugin('Effet', 'forest', 'volume', () => undefined, fail)).toBeUndefined();
    expect(console).toHaveBeenCalledWith('Effet forest : erreur dans volume', expect.any(Error));
  });
});
