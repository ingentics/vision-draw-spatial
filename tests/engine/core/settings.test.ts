import { describe, expect, it } from 'vitest';
import { DEFAULT_SHORTCUTS, shortcutAction } from '../../../src/engine/core/interaction/controls';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  resolveReducedMotion,
  SETTINGS_LIMITS,
} from '../../../src/engine/core/settings';
import type { SettingsPatch } from '../../../src/engine/core/settings';

describe('mergeSettings', () => {
  it('sans modification : les valeurs par défaut', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.view).toMatchObject({ defaultMode: 'top', isoAzimuthDeg: -45 });
    expect(DEFAULT_SETTINGS.accessibility.reducedMotion).toBe('system');
  });

  it('fusion section par section, le reste est conservé', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { transition: { durationMs: 600 }, minimap: { visible: false } });
    expect(merged.transition).toEqual({ ...DEFAULT_SETTINGS.transition, durationMs: 600 });
    expect(merged.minimap).toMatchObject({ visible: false, size: 200 });
    expect(merged.controls).toEqual(DEFAULT_SETTINGS.controls);
  });

  it('fond et grille : grille draw.io par défaut, couleurs #rrggbb, pas bornés', () => {
    expect(DEFAULT_SETTINGS.background).toEqual({
      color: '#ffffff',
      grid: true,
      gridFromPage: true,
      gridSize: 10,
      majorEvery: 4,
      gridColor: '#d4d9e0',
      minorStrength: 0.55,
    });
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      background: { color: '#1F2530', gridSize: 1000, majorEvery: 2.6 },
    });
    expect(merged.background).toMatchObject({ color: '#1f2530', gridSize: 200, majorEvery: 3 });
    const broken = { background: { color: 'red', gridColor: '#12', grid: 'oui' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).background).toEqual(DEFAULT_SETTINGS.background);
  });

  it('raccourcis : modifiables un par un', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { controls: { shortcuts: { toggleGraph: 'p' } } });
    expect(merged.controls.shortcuts).toEqual({ ...DEFAULT_SHORTCUTS, toggleGraph: 'p' });
  });

  it('raccourcis : vide seulement pour ceux sans touche par défaut (vue graphe, sujet 365)', () => {
    expect(DEFAULT_SHORTCUTS.toggleGraph).toBe('');
    const assigned = mergeSettings(DEFAULT_SETTINGS, { controls: { shortcuts: { toggleGraph: 'p' } } });
    const cleared = mergeSettings(assigned, { controls: { shortcuts: { toggleGraph: '', toggleMinimap: '' } } });
    expect(cleared.controls.shortcuts.toggleGraph).toBe('');
    expect(cleared.controls.shortcuts.toggleMinimap).toBe(DEFAULT_SHORTCUTS.toggleMinimap);
  });

  it('mini-graphe fermé par défaut (sujet 366)', () => {
    expect(DEFAULT_SETTINGS.minigraph.visible).toBe(false);
    expect(mergeSettings(DEFAULT_SETTINGS, { minigraph: { visible: true } }).minigraph.visible).toBe(true);
  });

  it('sélection : voile par défaut, contour animé en option, valeurs bornées', () => {
    expect(DEFAULT_SETTINGS.selection).toEqual({
      style: 'veil',
      veilOpacity: 0.35,
      animated: true,
      speed: 4,
      veilColor: '#202124',
      veilPadding: 10,
      accentColor: '#1a73e8',
    });
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { style: 'outline' } }).selection.style).toBe('outline');
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { veilOpacity: 2 } }).selection.veilOpacity).toBe(0.85);
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { speed: 500 } }).selection.speed).toBe(80);
    expect(mergeSettings(DEFAULT_SETTINGS, { selection: { animated: false } }).selection.animated).toBe(false);
  });

  it('schéma unique (sujet 245) : chaque réglage numérique a ses bornes, et sa valeur par défaut y est', () => {
    const valueAt = (path: string) =>
      path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], DEFAULT_SETTINGS);
    expect(Object.keys(SETTINGS_LIMITS)).toContain('panels.left.width');
    for (const [path, { min, max }] of Object.entries(SETTINGS_LIMITS)) {
      const value = valueAt(path) as number;
      expect(value, path).toBeGreaterThanOrEqual(min);
      expect(value, path).toBeLessThanOrEqual(max);
    }
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
    expect(shortcutAction('P', DEFAULT_SHORTCUTS)).toBe('toggle3d');
    expect(shortcutAction('Enter', DEFAULT_SHORTCUTS)).toBe('overview');
    expect(shortcutAction('Backspace', DEFAULT_SHORTCUTS)).toBe('deleteSelection');
    expect(shortcutAction('x', DEFAULT_SHORTCUTS)).toBeUndefined();
    // Vue graphe : aucune touche par défaut (sujet 365) ; G affiche le mini-graphe (sujet 366).
    expect(shortcutAction('g', DEFAULT_SHORTCUTS)).toBe('toggleMinigraph');
  });

  it('raccourcis personnalisés', () => {
    expect(shortcutAction('k', { ...DEFAULT_SHORTCUTS, toggleGraph: 'k' })).toBe('toggleGraph');
    expect(shortcutAction('g', { ...DEFAULT_SHORTCUTS, toggleGraph: 'k', toggleMinigraph: 'j' })).toBeUndefined();
  });
});

describe('sauvegarde automatique', () => {
  it('activée par défaut (1 s) ; délai borné, valeurs invalides ignorées', () => {
    expect(DEFAULT_SETTINGS.save).toEqual({ autosave: true, delayMs: 1000, viewStateDelayMs: 500, recentLimit: 20 });
    expect(mergeSettings(DEFAULT_SETTINGS, { save: { delayMs: 10 } }).save.delayMs).toBe(300);
    expect(mergeSettings(DEFAULT_SETTINGS, { save: { delayMs: 999_999 } }).save.delayMs).toBe(30_000);
    const broken = { save: { autosave: 'oui', delayMs: 'vite' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).save).toEqual(DEFAULT_SETTINGS.save);
  });
});

describe('barres latérales (étape 47)', () => {
  it('ouvertes par défaut, 208 px à gauche et 380 px à droite, nom des bandes de bas en haut', () => {
    expect(DEFAULT_SETTINGS.panels).toEqual({
      left: { collapsed: false, width: 208 },
      right: { collapsed: false, width: 380 },
      stripText: 'up',
      shadow: 0.06,
      minCanvas: 320,
    });
  });

  it('ombre des barres sur la zone de dessin : 6 % par défaut, bornée entre 0 et 30 % (étape 88)', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, { panels: { shadow: 0 } }).panels.shadow).toBe(0);
    expect(mergeSettings(DEFAULT_SETTINGS, { panels: { shadow: 0.9 } }).panels.shadow).toBe(0.3);
    const broken = { panels: { shadow: 'forte' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).panels.shadow).toBe(0.06);
  });

  it('sens du nom des bandes : « up » ou « down », sinon la valeur par défaut (étape 48)', () => {
    expect(mergeSettings(DEFAULT_SETTINGS, { panels: { stripText: 'down' } }).panels.stripText).toBe('down');
    const broken = { panels: { stripText: 'gauche' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).panels.stripText).toBe('up');
  });

  it('fusion barre par barre : le reste est conservé', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, { panels: { right: { collapsed: true } } });
    expect(merged.panels).toEqual({ ...DEFAULT_SETTINGS.panels, right: { collapsed: true, width: 380 } });
    expect(mergeSettings(merged, { panels: { left: { width: 300 } } }).panels.right.collapsed).toBe(true);
  });

  it('largeurs bornées (160–400 à gauche, 240–600 à droite) et arrondies', () => {
    const merged = (left: number, right: number) =>
      mergeSettings(DEFAULT_SETTINGS, { panels: { left: { width: left }, right: { width: right } } }).panels;
    expect(merged(10, 10)).toMatchObject({ left: { width: 160 }, right: { width: 240 } });
    expect(merged(9999, 9999)).toMatchObject({ left: { width: 400 }, right: { width: 600 } });
    expect(merged(250.6, 333.2)).toMatchObject({ left: { width: 251 }, right: { width: 333 } });
  });

  it('valeurs invalides ou absentes (anciens paramètres) : valeurs par défaut', () => {
    const broken = { panels: { left: { collapsed: 'oui', width: 'large' }, right: null } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).panels).toEqual(DEFAULT_SETTINGS.panels);
    expect(mergeSettings(DEFAULT_SETTINGS, { view: { isoDepth: 20 } }).panels).toEqual(DEFAULT_SETTINGS.panels);
  });
});

describe('réglages exposés (caméra, vue graphe, édition…)', () => {
  it('valeurs par défaut identiques aux anciennes constantes du moteur', () => {
    expect(DEFAULT_SETTINGS.camera).toEqual({
      minZoom: 0.05,
      maxZoom: 16,
      minZoom3d: 0.1,
      maxZoom3d: 4,
      maxTilt3dDeg: 65,
      fovDeg: 45,
      animationMs: 250,
      focusMaxZoom: 2,
      focusPadding: 80,
    });
    expect(DEFAULT_SETTINGS.graph).toEqual({
      nodeSize: 64,
      nodeGap: 50,
      layerGap: 20,
      pairOffset: 15,
      cardColor: '#9aa0a6',
      orphanColor: '#d93025',
      unreachableColor: '#e37400',
      arcColor: '#5f6368',
      titleColor: '#202124',
      transitionMs: 0,
    });
    expect(DEFAULT_SETTINGS.minimap).toMatchObject({ edgeColor: '#80868b', outlineColor: '#9aa0a6' });
    expect(mergeSettings(DEFAULT_SETTINGS, { graph: { arcColor: 'rouge' } }).graph.arcColor).toBe('#5f6368');
    expect(DEFAULT_SETTINGS.edit).toEqual({
      edgePickTolerance: 6,
      handlePickTolerance: 8,
      handleSize: 4,
      minShapeSize: 10,
      nudgeStep: 1,
      nudgeCoarseStep: 0,
      alignReference: 'last',
      undoLimit: 100,
      pasteOffset: 10,
      edgePointAlignTolerance: 4,
      connectHandleOffset: 18,
      middleHandleMinSpan: 32,
    });
    expect(DEFAULT_SETTINGS.shapes.edgeLoopMargin).toBe(20);
    expect(DEFAULT_SETTINGS.controls).toMatchObject({
      clickSlop: 4,
      maxReleaseSpeed: 3000,
      releaseWindowMs: 80,
      stopSpeed: 8,
    });
    expect(mergeSettings(DEFAULT_SETTINGS, { edit: { undoLimit: 5.4 } }).edit.undoLimit).toBe(10);
    expect(DEFAULT_SETTINGS.controls.orbitSpeed).toBe(0.005);
    expect(DEFAULT_SETTINGS.controls.multiSelectKey).toBe('ctrl');
    expect(DEFAULT_SETTINGS.controls.rotateSpeed).toBe(90);
    expect(DEFAULT_SETTINGS.view.facadeTags).toBe(true);
    expect(mergeSettings(DEFAULT_SETTINGS, { controls: { rotateSpeed: 9999 } }).controls.rotateSpeed).toBe(360);
    expect(mergeSettings(DEFAULT_SETTINGS, { controls: { multiSelectKey: 'shift' } }).controls.multiSelectKey).toBe(
      'shift',
    );
    const broken = { controls: { multiSelectKey: 'f' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, broken).controls.multiSelectKey).toBe('ctrl');
    expect(DEFAULT_SETTINGS.controls.followLinkKey).toBe('space');
    expect(mergeSettings(DEFAULT_SETTINGS, { controls: { followLinkKey: 'none' } }).controls.followLinkKey).toBe(
      'none',
    );
    const brokenFollow = { controls: { followLinkKey: 'f' } } as unknown as SettingsPatch;
    expect(mergeSettings(DEFAULT_SETTINGS, brokenFollow).controls.followLinkKey).toBe('space');
    expect(DEFAULT_SETTINGS.controls.followLinkGesture).toBe('click');
    expect(
      mergeSettings(DEFAULT_SETTINGS, { controls: { followLinkGesture: 'doubleClick' } }).controls.followLinkGesture,
    ).toBe('doubleClick');
    expect(DEFAULT_SETTINGS.transition).toMatchObject({ fadeStart: 0.25, fadeEnd: 0.75 });
  });

  it('caméra : bornes cohérentes (le zoom maximal ne passe jamais sous le minimal)', () => {
    const camera = mergeSettings(DEFAULT_SETTINGS, { camera: { minZoom: 0.8, maxZoom: 0.2, fovDeg: 500 } }).camera;
    expect(camera.minZoom).toBe(0.8);
    expect(camera.maxZoom).toBe(1);
    expect(camera.fovDeg).toBe(100);
  });

  it('couleurs invalides ignorées', () => {
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      selection: { accentColor: 'bleu' },
      shapes: { placeholderFill: '#ABCDEF' },
    });
    expect(merged.selection.accentColor).toBe('#1a73e8');
    expect(merged.shapes.placeholderFill).toBe('#abcdef');
    expect(DEFAULT_SETTINGS.shapes.edgeFontColor).toBe('#000000');
  });
  it('palettes de styles : remplacées si toutes les entrées sont valides, sinon gardées', () => {
    expect(DEFAULT_SETTINGS.styles.base[2]).toEqual({ name: 'Bleu', fillColor: '#dae8fc', strokeColor: '#6c8ebf' });
    const custom = [{ name: 'Mon style', fillColor: '#AABBCC', strokeColor: '#112233' }];
    expect(mergeSettings(DEFAULT_SETTINGS, { styles: { base: custom } }).styles.base).toEqual([
      { name: 'Mon style', fillColor: '#aabbcc', strokeColor: '#112233' },
    ]);
    const broken = [...custom, { name: 'Abîmé', fillColor: 'rouge', strokeColor: '#000000' }];
    const merged = mergeSettings(DEFAULT_SETTINGS, { styles: { extended: broken } });
    expect(merged.styles.extended).toBe(DEFAULT_SETTINGS.styles.extended);
  });
  it('styles de texte : Classique, Feutré, Code ; liste invalide ignorée', () => {
    expect(DEFAULT_SETTINGS.styles.text.map((preset) => preset.name)).toEqual(['Classique', 'Feutré', 'Code']);
    expect(DEFAULT_SETTINGS.styles.text[2]).toMatchObject({ fontFamily: 'Courier New' });
    const custom = [{ name: 'Titre', fontSize: 18, fontColor: '#1A73E8' }];
    expect(mergeSettings(DEFAULT_SETTINGS, { styles: { text: custom } }).styles.text).toEqual([
      { name: 'Titre', fontSize: 18, fontColor: '#1a73e8' },
    ]);
    const broken = [{ name: 'Sans taille', fontColor: '#000000' }] as unknown as typeof custom;
    expect(mergeSettings(DEFAULT_SETTINGS, { styles: { text: broken } }).styles.text).toBe(
      DEFAULT_SETTINGS.styles.text,
    );
  });
  it('tailles du texte créé : 12 px, 9 px pour les textes de début et de fin ; bornées et entières', () => {
    expect(DEFAULT_SETTINGS.shapes).toMatchObject({ textSize: 12, edgeEndTextSize: 9 });
    const merged = mergeSettings(DEFAULT_SETTINGS, { shapes: { textSize: 200, edgeEndTextSize: 8.6 } });
    expect(merged.shapes).toMatchObject({ textSize: 72, edgeEndTextSize: 9 });
  });
  it('nouvelles flèches : coudes arrondis par défaut ; écarts des textes de début et de fin', () => {
    expect(DEFAULT_SETTINGS.shapes).toMatchObject({
      edgeLineStyle: 'rounded',
      edgeEndTextGapAlong: 6,
      edgeEndTextGapAcross: 4,
    });
    const merged = mergeSettings(DEFAULT_SETTINGS, {
      shapes: { edgeLineStyle: 'zigzag' as never, edgeEndTextGapAcross: 100 },
    });
    expect(merged.shapes).toMatchObject({ edgeLineStyle: 'rounded', edgeEndTextGapAcross: 40 });
  });
  it('croisements des nouvelles flèches (étape 132) : aucun saut par défaut, taille 6 pt bornée et entière', () => {
    expect(DEFAULT_SETTINGS.shapes).toMatchObject({ edgeJumpStyle: 'none', edgeJumpSize: 6 });
    const merged = mergeSettings(DEFAULT_SETTINGS, { shapes: { edgeJumpStyle: 'arc', edgeJumpSize: 99.4 } });
    expect(merged.shapes).toMatchObject({ edgeJumpStyle: 'arc', edgeJumpSize: 40 });
    const invalid = mergeSettings(DEFAULT_SETTINGS, { shapes: { edgeJumpStyle: 'bridge' as never } });
    expect(invalid.shapes.edgeJumpStyle).toBe('none');
  });
});
