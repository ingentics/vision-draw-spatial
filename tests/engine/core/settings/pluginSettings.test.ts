import { describe, expect, it } from 'vitest';
import { PageEffectRegistry } from '../../../../src/engine/core/effects/registry';
import { PageModeRegistry } from '../../../../src/engine/core/modes/registry';
import { pluginValues } from '../../../../src/engine/core/settings/pluginSettings';
import type { PluginSetting } from '../../../../src/engine/core/settings/pluginSettings';

const SETTINGS: PluginSetting[] = [
  { key: 'gap', type: 'number', label: 'Écart', min: 0, max: 80, step: 1, default: 20 },
  { key: 'shown', type: 'toggle', label: 'Montré', default: true },
  { key: 'color', type: 'color', label: 'Couleur', default: '#000000' },
];

describe('réglages des plugins (sujet 287)', () => {
  it('nombre borné, mauvais type ou absent : défaut ; clé inconnue ignorée', () => {
    expect(pluginValues(SETTINGS, { gap: 500, shown: 'oui', color: '#ABCDEF', other: 1 })).toEqual({
      gap: 80,
      shown: true,
      color: '#ABCDEF',
    });
    expect(pluginValues(SETTINGS, { gap: -3, shown: false, color: 'rouge' })).toEqual({
      gap: 0,
      shown: false,
      color: '#000000',
    });
    expect(pluginValues(SETTINGS, { gap: Number.NaN })).toEqual({ gap: 20, shown: true, color: '#000000' });
    expect(pluginValues(undefined, { gap: 3 })).toEqual({});
  });

  it('les registres des modes et des effets lisent leurs réglages de la même façon', () => {
    const modes = new PageModeRegistry().register({ id: 'm', name: 'M', settings: SETTINGS });
    const effects = new PageEffectRegistry().register({ id: 'e', name: 'E', settings: SETTINGS });
    const stored = { gap: 500, shown: 'oui', color: '#123456' };
    expect(modes.values('m', stored)).toEqual(pluginValues(SETTINGS, stored));
    expect(effects.values('e', stored)).toEqual(pluginValues(SETTINGS, stored));
  });
});
