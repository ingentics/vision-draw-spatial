import { afterEach, describe, expect, it, vi } from 'vitest';
import { Object3D } from 'three';
import { PageEffectRegistry } from '../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../src/engine/core/format/parse';

const page = readDrawio(
  `<mxfile><diagram id="p" name="P" spatial.effects="boom,decor"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`,
).document.pages[0]!;

describe('registre des effets (sujet 378)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('id hors de ^[a-z][a-z0-9-]*$ refusé à l’enregistrement : il est écrit dans une liste à virgules', () => {
    const registry = new PageEffectRegistry();
    for (const id of ['Foret', 'a,b', 'a b', '1er', '', 'tiret_bas'])
      expect(() => registry.register({ id, name: id })).toThrow('id invalide');
    expect(() => registry.register({ id: 'brume-2', name: 'Brume' })).not.toThrow();
  });

  it('décor en panne sans rapporteur : omis, erreur à la console, les autres décors posés', () => {
    const console = vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
    const registry = new PageEffectRegistry()
      .register({
        id: 'boom',
        name: 'Boom',
        volume: () => {
          throw new Error('panne');
        },
      })
      .register({ id: 'decor', name: 'Décor', volume: () => new Object3D() });
    const root = new Object3D();
    expect(() => registry.decorate(page, root)).not.toThrow();
    expect(root.children.map((child) => child.name)).toEqual(['effect:decor']);
    expect(console).toHaveBeenCalledWith('Effet boom : erreur dans volume', expect.any(Error));
  });
});
