import { describe, expect, it } from 'vitest';
import { clamp, easeInOutCubic } from '../../../../src/engine/core/model/numbers';

describe('clamp (sujet 325)', () => {
  it('ramène dans les bornes, bornes comprises', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('bornes inversées : le minimum l’emporte (écriture `Math.max(min, Math.min(max, v))` des plugins)', () => {
    expect(clamp(5, 8, 3)).toBe(8);
    expect(clamp(NaN, 0, 1)).toBeNaN();
  });
});

describe('easeInOutCubic (sujet 526)', () => {
  it('part de 0, passe par le milieu, arrive à 1, lente aux bouts', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });
});
