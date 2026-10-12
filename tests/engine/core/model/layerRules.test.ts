import { describe, expect, it } from 'vitest';
import { layerRules } from '../../../../src/engine/core/model/layerRules';

// Sujet 523 : ce qu'un élément doit à son calque.

describe('règles des calques (sujet 523)', () => {
  const rules = layerRules({
    layers: [
      { id: 'open', name: '', visible: true, locked: false, elevation: 0 },
      { id: 'hidden', name: '', visible: false, locked: false, elevation: 0 },
      { id: 'locked', name: '', visible: true, locked: true, elevation: 0 },
    ],
  });

  it('dessiné : visible, sur un calque visible (verrouillé compris)', () => {
    expect(rules.shown({ visible: true, layerId: 'open' })).toBe(true);
    expect(rules.shown({ visible: true, layerId: 'locked' })).toBe(true);
    expect(rules.shown({ visible: true, layerId: 'hidden' })).toBe(false);
    expect(rules.shown({ visible: false, layerId: 'open' })).toBe(false);
  });

  it('touchable : dessiné, sur un calque déverrouillé', () => {
    expect(rules.touchable({ visible: true, layerId: 'open' })).toBe(true);
    expect(rules.touchable({ visible: true, layerId: 'locked' })).toBe(false);
    expect(rules.touchable({ visible: true, layerId: 'hidden' })).toBe(false);
  });
});
