import { describe, expect, it } from 'vitest';
import { clamp } from '../../../../src/engine/core/model/numbers';

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
