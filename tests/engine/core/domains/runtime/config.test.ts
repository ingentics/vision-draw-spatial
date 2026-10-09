import { describe, expect, it, vi } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { Config } from '../../../../../src/engine/core/domains/runtime/config';
import { Levels } from '../../../../../src/engine/core/domains/view/levels';
import { ViewModes } from '../../../../../src/engine/core/domains/view/viewModes';
import type { IsoViewParams } from '../../../../../src/engine/core/format/viewState';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';
import type { Settings } from '../../../../../src/engine/core/settings';
import { traced } from '../traced';

/**
 * Cœur traçant (sujet 385) : paramètres, modes de vue et niveaux réels ; scènes tracées, événements notés dans l'ordre
 * (`log`) ; `iso` : réglages iso enregistrés pour la page `p`.
 */
function setup(iso: IsoViewParams) {
  vi.stubGlobal('window', {});
  const log: string[] = [];
  const settings: Settings[] = [];
  const core = {
    pages: { isoOf: (pageId: string) => (pageId === 'p' ? iso : undefined) },
    scenes: traced(log, 'scenes'),
    events: {
      emit: (name: string, payload: Settings) => {
        log.push(`emit:${name}`);
        settings.push(payload);
      },
    },
  } as unknown as Record<string, unknown>;
  const config = new Config(core as unknown as EngineCore, {});
  const levels = new Levels(core as unknown as EngineCore);
  Object.defineProperty(core, 'settings', { get: () => config.settings });
  Object.assign(core, {
    config,
    levels,
    viewModes: new ViewModes(core as unknown as EngineCore),
    // Comme `EngineCore.pageSettingsAdopted` : les niveaux seuls en dépendent.
    pageSettingsAdopted: (next: Settings, previous: Settings) => levels.pageSettingsAdopted(next, previous),
  });
  vi.unstubAllGlobals();
  return { core: core as unknown as EngineCore, log, settings };
}

describe('réglages iso propres à une page (sujet 385)', () => {
  it('volume changé : scènes vidées, puis réglages émis', () => {
    const base = DEFAULT_SETTINGS.view;
    const { core, log, settings } = setup({ ...base, isoVolume: !base.isoVolume });
    core.viewModes.applyPageIso('p');
    expect(log).toEqual(['scenes.clear', 'emit:settingsChange']);
    expect(settings[0]!.view.isoVolume).toBe(!base.isoVolume);
  });

  it('angle seul changé : réglages émis, scènes gardées ; mêmes réglages : rien', () => {
    const base = DEFAULT_SETTINGS.view;
    const changed = setup({ ...base, isoAngleDeg: base.isoAngleDeg + 5 });
    changed.core.viewModes.applyPageIso('p');
    expect(changed.log).toEqual(['emit:settingsChange']);
    expect(changed.settings[0]!.view.isoAngleDeg).toBe(base.isoAngleDeg + 5);
    const same = setup({ ...base });
    same.core.viewModes.applyPageIso('p');
    expect(same.log).toEqual([]);
  });
});
