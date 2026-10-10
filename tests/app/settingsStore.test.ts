import { describe, expect, it } from 'vitest';
import { settingsDiff, withLegacy } from '../../src/app/settingsStore';
import { DEFAULT_SETTINGS, mergeSettings } from '../../src/engine';
import type { SettingsPatch } from '../../src/engine';

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

describe('paramètres enregistrés : anciennes clés reprises (sujet 380)', () => {
  const load = (stored: unknown) => mergeSettings(DEFAULT_SETTINGS, withLegacy(stored as SettingsPatch));

  it('« étiquettes sur les façades » coupé dans la vue iso : repris dans Formes › Architecture', () => {
    const settings = load({ view: { facadeTags: false, isoDepth: 40 } });
    expect(settings.shapeCategories).toEqual({ architecture: { facadeTags: false } });
    expect(settings.view.isoDepth).toBe(40);
    // L'ancienne clé, hors du schéma, n'est plus enregistrée.
    expect(settingsDiff(settings, DEFAULT_SETTINGS)).toEqual({
      view: { isoDepth: 40 },
      shapeCategories: { architecture: { facadeTags: false } },
    });
  });

  it('valeur déjà enregistrée à la nouvelle place : elle l’emporte', () => {
    const stored = { view: { facadeTags: false }, shapeCategories: { architecture: { facadeTags: true } } };
    expect(load(stored).shapeCategories).toEqual({ architecture: { facadeTags: true } });
  });

  it('ancienne valeur égale au défaut : rien à reprendre', () => {
    const stored = { view: { facadeTags: true } };
    expect(withLegacy(stored as SettingsPatch)).toBe(stored);
  });
});

describe('paramètres enregistrés : moteur de rendu PlantUML repris du mode Séquences (sujet 439)', () => {
  const load = (stored: unknown) => mergeSettings(DEFAULT_SETTINGS, withLegacy(stored as SettingsPatch));

  it('réglages du mode Séquences : repris dans Exporteurs › PlantUML et retirés du mode', () => {
    const settings = load({
      modes: { sequences: { plantumlRenderer: 'local', plantumlUrl: 'http://localhost:9000', dimOpacity: 0.5 } },
    });
    expect(settings.exporters.plantuml).toEqual({ renderer: 'local', localUrl: 'http://localhost:9000' });
    expect(settings.modes).toEqual({ sequences: { dimOpacity: 0.5 } });
  });

  it('valeur déjà enregistrée à la nouvelle place : elle l’emporte ; valeur invalide : défaut', () => {
    const kept = load({
      modes: { sequences: { plantumlRenderer: 'local' } },
      exporters: { plantuml: { renderer: 'plantuml' } },
    });
    expect(kept.exporters.plantuml.renderer).toBe('plantuml');
    expect(kept.modes).toEqual({});
    expect(load({ modes: { sequences: { plantumlUrl: 'ftp://x' } } }).exporters.plantuml).toEqual(
      DEFAULT_SETTINGS.exporters.plantuml,
    );
  });

  it('anciennes clés sous un autre mode : reprises de même, sans nom de mode en dur (sujet 454)', () => {
    const settings = load({ modes: { autre: { plantumlRenderer: 'local' }, sequences: { dimOpacity: 0.5 } } });
    expect(settings.exporters.plantuml.renderer).toBe('local');
    expect(settings.modes).toEqual({ sequences: { dimOpacity: 0.5 } });
  });
});
