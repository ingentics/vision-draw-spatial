import { describe, expect, it } from 'vitest';
import { TOGGLE_ON, isToggled, toggleValue } from '../../../../src/engine/core/modes/modeProperties';

describe('convention des réglages toggle (sujet 316)', () => {
  it('coché = « 1 », décoché = pas de valeur', () => {
    expect(TOGGLE_ON).toBe('1');
    expect(toggleValue(true)).toBe('1');
    expect(toggleValue(false)).toBeUndefined();
    expect(isToggled('1')).toBe(true);
    for (const value of [undefined, '', '0', 'true']) expect(isToggled(value)).toBe(false);
  });
});
