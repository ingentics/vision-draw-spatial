import { describe, expect, it } from 'vitest';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { fail, setup } from './modesCore';

/** Mode de test : Tab passe de « a » à « b » et inversement ; X n'est jamais pris ; P est en panne. */
const LAYERS: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  current: { initial: () => 'a', valid: (_page, value) => value === 'a' || value === 'b' },
  pageKeys: {
    Tab: { label: 'Couche', run: (_page, current) => (current === 'a' ? 'b' : 'a') },
    X: { label: 'Jamais', applies: () => false, run: fail },
    P: { label: 'Panne', run: fail },
  },
};

function layers(selected: string[] = []) {
  const set = setup(LAYERS);
  const layer = { current: 'a', chosen: [] as string[] };
  Object.assign(set.core, {
    pages: { ...set.core.pages, getCurrentPage: () => set.page },
    selection: { current: selected.length ? { pageId: set.page.id, items: selected } : undefined },
    modeCurrents: {
      getModeCurrent: () => layer.current,
      setModeCurrent: (value: string) => (layer.chosen.push(value), (layer.current = value)),
    },
  });
  return { ...set, layer };
}

describe('touches de page d’un mode (sujet 415)', () => {
  it('sans sélection : la touche change le courant, sans rien écrire', () => {
    const { panel, layer, state } = layers();
    expect(panel.modePageKey('Tab', true)).toBe(true);
    expect(panel.modePageKey('Tab', true)).toBe(true);
    expect(layer.chosen).toEqual(['b', 'a']);
    expect(state).toMatchObject({ snapshots: [], changed: 0 });
  });

  it('touche maintenue : prise sans rien refaire', () => {
    const { panel, layer } = layers();
    expect(panel.modePageKey('Tab', false)).toBe(true);
    expect(layer.chosen).toEqual([]);
  });

  it('avec une sélection, touche inconnue ou non concernée : pas prise', () => {
    expect(layers(['a']).panel.modePageKey('Tab', true)).toBe(false);
    const { panel, layer } = layers();
    expect(panel.modePageKey('Enter', true)).toBe(false);
    expect(panel.modePageKey('X', true)).toBe(false);
    expect(layer.chosen).toEqual([]);
  });

  it('point d’entrée en panne : touche prise, courant inchangé, panne signalée', () => {
    const { panel, layer, guard } = layers();
    expect(panel.modePageKey('P', true)).toBe(true);
    expect(layer.chosen).toEqual([]);
    expect(guard.warnings().map((w) => w.message)).toEqual(['Mode boom : erreur dans touche de page « P » (panne)']);
  });
});
