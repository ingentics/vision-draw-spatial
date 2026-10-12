import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, MetamorphRequest } from '../../../src/engine';
import { acceptMetamorph, installMetamorph } from '../../../src/app/metamorph/metamorphHost';
import type { MetamorphServer } from '../../../src/app/metamorph/metamorphServer';

type Listener = (value: never) => unknown;

/** Faux moteur : écouteurs déclenchables, appels reçus notés, bibliothèque Metamorph chargée ou non. */
function fakeEngine(loaded: string[] = []) {
  const listeners = new Map<string, Listener>();
  const calls: unknown[][] = [];
  const engine = {
    on: (event: string, listener: Listener) => listeners.set(event, listener),
    registerShapes: () => ({ ok: true }),
    shapeLibrary: (id: string) =>
      id === 'metamorph' && loaded.length > 0 ? { shapes: loaded.map((shape) => ({ id: shape })) } : undefined,
    markShapesUnavailable: (refs: unknown) => calls.push(['unavailable', refs]),
    metamorphResults: (shapeId: string) => {
      calls.push(['results', shapeId]);
      return { ok: true };
    },
    metamorphFailed: (shapeId: string, error: string) => calls.push(['failed', shapeId, error]),
    acceptMetamorph: (shapeId: string, templateId: string) => calls.push(['accept', shapeId, templateId]),
  } as unknown as Engine;
  const emit = async (event: string, value: unknown) => {
    await (listeners.get(event) as (value: unknown) => unknown)(value);
    // Laisse finir les promesses lancées sans attente (`void`).
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { engine, calls, emit };
}

const server = (overrides: Partial<MetamorphServer>): MetamorphServer => ({
  library: () => Promise.resolve(undefined),
  generate: () => Promise.resolve({}),
  accept: () => Promise.resolve(undefined),
  ...overrides,
});

const request = { shapeId: 'm' } as MetamorphRequest;

describe('branchement des Metamorph (sujet 543)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('génération rejetée par le serveur : le moteur est prévenu de l’échec', async () => {
    const { engine, calls, emit } = fakeEngine();
    installMetamorph(engine, server({ generate: () => Promise.reject(new Error('réseau')) }));
    await emit('metamorphRequest', request);
    expect(calls).toEqual([['failed', 'm', expect.stringContaining('échoué')]]);
  });

  it('propositions reçues : transmises au moteur', async () => {
    const { engine, calls, emit } = fakeEngine();
    installMetamorph(engine, server({}));
    await emit('metamorphRequest', request);
    expect(calls).toEqual([['results', 'm']]);
  });

  it('formes Metamorph inconnues du serveur : déclarées introuvables, les connues non', async () => {
    const { engine, calls, emit } = fakeEngine(['a']);
    installMetamorph(engine, server({}));
    await emit('shapesMissing', [
      { library: 'metamorph', kind: 'a' },
      { library: 'metamorph', kind: 'b' },
      { library: 'autre', kind: 'c' },
    ]);
    expect(calls).toEqual([['unavailable', [{ library: 'metamorph', kind: 'b' }]]]);
  });

  it('serveur sans aucune forme ou en erreur : toutes les formes demandées introuvables', async () => {
    const { engine, calls, emit } = fakeEngine();
    installMetamorph(engine, server({ library: () => Promise.reject(new Error('réseau')) }));
    await emit('shapesMissing', [{ library: 'metamorph', kind: 'a' }]);
    expect(calls).toEqual([['unavailable', [{ library: 'metamorph', kind: 'a' }]]]);
  });

  it('proposition choisie : erreur du serveur attrapée, forme non remplacée', async () => {
    const { engine, calls } = fakeEngine();
    await acceptMetamorph(engine, 'm', 'x', server({ accept: () => Promise.reject(new Error('réseau')) }));
    expect(calls).toEqual([]);
    await acceptMetamorph(engine, 'm', 'x', server({ accept: () => Promise.resolve({}) }));
    expect(calls).toEqual([['accept', 'm', 'metamorph:x']]);
  });
});
