import { describe, expect, it } from 'vitest';
import { DEFAULT_SHORTCUTS, shortcutAction } from '../../src/engine/interaction/controls';
import { DEFAULT_SETTINGS, mergeSettings, resolveReducedMotion } from '../../src/engine/settings';
import type { SettingsPatch } from '../../src/engine/settings';

describe('mergeSettings', () => {
  it('sans modification : les valeurs par défaut', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.view).toMatchObject({ defaultMode: 'top', isoAzimuthDeg: -45 });
    expect(DEFAULT_SETTINGS.accessibility.reducedMotion).toBe('system');
  });

  it('fusion section par section, le reste est conservé', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { transition: { durationMs: 600 }, minimap: { visible: false } });
    expect(merged.transition).toEqual({ ...DEFAULT_SETTINGS.transition, durationMs: 600 });
    expect(merged.minimap).toEqual({ visible: false, size: 200 });
    expect(merged.controls).toEqual(DEFAULT_SETTINGS.controls);
  });

  it('raccourcis : modifiables un par un', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { controls: { shortcuts: { toggleGraph: 'p' } } });
    expect(merged.controls.shortcuts).toEqual({ ...DEFAULT_SHORTCUTS, toggleGraph: 'p' });
  });

  it('sélection : contour animé lentement par défaut, vitesse bornée', () => {
    expect(DEFAULT_SETTINGS.selection).toEqual({ animated: true, speed: 12 });
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { speed: 500 } }).selection.speed).toBe(80);
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { animated: false } }).selection.animated).toBe(false);
  });

  it('nombres ramenés dans leurs bornes', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      transition: { durationMs: -100 },
      view: { isoAngleDeg: 120 },
      preload: { maxCachedPages: 3.7 },
    });
    expect(merged.transition.durationMs).toBe(0);
    expect(merged.view.isoAngleDeg).toBe(80);
    expect(merged.preload.maxCachedPages).toBe(4);
  });

  it('valeurs invalides ignorées (stockage abîmé ou ancien)', () => {
    const broken = {
      transition: { enabled: 'oui', easing: 'rebond', durationMs: Number.NaN },
      controls: { moveKeys: 'souris', shortcuts: { back: '' } },
      accessibility: { reducedMotion: 'peut-être' },
      inconnu: { x: 1 },
    } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('resolveReducedMotion', () => {
  it('système / toujours / jamais', () => {
    expect(resolveReducedMotion('system', true)).toBe(true);
    expect(resolveReducedMotion('system', false)).toBe(false);
    expect(resolveReducedMotion('always', false)).toBe(true);
    expect(resolveReducedMotion('never', true)).toBe(false);
  });
});

describe('shortcutAction', () => {
  it('par touche affichée, insensible à la casse (M = m, quelle que soit la disposition)', () => {
    expect(shortcutAction('m', DEFAULT_SHORTCUTS)).toBe('toggleMinimap');
    expect(shortcutAction('M', DEFAULT_SHORTCUTS)).toBe('toggleMinimap');
    expect(shortcutAction('I', DEFAULT_SHORTCUTS)).toBe('toggleViewMode');
    expect(shortcutAction('Enter', DEFAULT_SHORTCUTS)).toBe('overview');
    expect(shortcutAction('Backspace', DEFAULT_SHORTCUTS)).toBe('back');
    expect(shortcutAction('x', DEFAULT_SHORTCUTS)).toBeUndefined();
  });

  it('raccourcis personnalisés', () => {
    expect(shortcutAction('p', { ...DEFAULT_SHORTCUTS, toggleGraph: 'p' })).toBe('toggleGraph');
    expect(shortcutAction('g', { ...DEFAULT_SHORTCUTS, toggleGraph: 'p' })).toBeUndefined();
  });
});
