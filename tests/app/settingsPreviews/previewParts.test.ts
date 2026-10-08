import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../src/engine';
import { mixColor, planStyle } from '../../../src/app/settingsPreviews/previewParts';

describe('aperçus des paramètres (sujets 320, 321)', () => {
  it('mêle deux couleurs, et éclaircit au-delà de 1 sans dépasser le blanc', () => {
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixColor('#ffffff', '#d4d9e0', 0)).toBe('#ffffff');
    expect(mixColor('#000000', '#dae8fc', 1.2)).toBe('#ffffff');
  });

  it('dessine la grille comme le moteur : lignes principales pleines, secondaires mêlées au fond', () => {
    const background = { ...DEFAULT_SETTINGS.background, color: '#ffffff', gridColor: '#000000', gridSize: 10 };
    const style = planStyle({ ...background, majorEvery: 4, minorStrength: 0.5 }, 2);
    expect(style.backgroundImage).toContain('#000000');
    expect(style.backgroundImage).toContain('#808080');
    expect(style.backgroundSize).toBe('80px 80px, 80px 80px, 20px 20px, 20px 20px');
    expect(planStyle({ ...background, majorEvery: 1 }).backgroundSize).toBe('10px 10px, 10px 10px');
    expect(planStyle({ ...background, grid: false })).toEqual({ backgroundColor: '#ffffff' });
  });
});
