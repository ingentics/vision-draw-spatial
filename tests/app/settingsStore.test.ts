import { describe, expect, it } from 'vitest';
import { settingsDiff } from '../../src/app/settingsStore';
import { DEFAULT_SETTINGS, mergeSettings } from '../../src/engine';

describe('paramètres enregistrés : écarts aux défauts seulement (sujet 364)', () => {
  it('les défauts seuls : rien à enregistrer', () => {
    expect(settingsDiff(DEFAULT_SETTINGS, DEFAULT_SETTINGS)).toEqual({});
  });

  it('un réglage modifié : seul ce réglage est enregistré', () => {
    const settings = mergeSettings(DEFAULT_SETTINGS, {
      graph: { nodeSize: 80 },
      controls: { shortcuts: { toggleGraph: 'k' } },
    });
    expect(settingsDiff(settings, DEFAULT_SETTINGS)).toEqual({
      graph: { nodeSize: 80 },
      controls: { shortcuts: { toggleGraph: 'k' } },
    });
  });

  it('relu sur des défauts changés : le réglage modifié reste, les nouveaux défauts s’appliquent au reste', () => {
    const saved = settingsDiff(mergeSettings(DEFAULT_SETTINGS, { graph: { nodeSize: 80 } }), DEFAULT_SETTINGS);
    const newDefaults = mergeSettings(DEFAULT_SETTINGS, { graph: { nodeGap: 120 } });
    const loaded = mergeSettings(newDefaults, saved);
    expect(loaded.graph.nodeSize).toBe(80);
    expect(loaded.graph.nodeGap).toBe(120);
  });
});
