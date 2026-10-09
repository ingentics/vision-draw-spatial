import { describe, expect, it } from 'vitest';
import { fontStyleBits, fontStyleValue, isHexColor } from '../../../../src/engine/core/model/styleValues';

describe('isHexColor (sujet 291)', () => {
  it('#rrggbb, casse libre ; ni forme courte, ni nom, ni absent', () => {
    expect(isHexColor('#dae8fc')).toBe(true);
    expect(isHexColor('#DAE8FC')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#dae8fc ')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });

  it('forme courte #rgb acceptée sur demande (sujet 383), et rien d’autre', () => {
    expect(isHexColor('#AbC', true)).toBe(true);
    expect(isHexColor('#dae8fc', true)).toBe(true);
    expect(isHexColor('#abcd', true)).toBe(false);
    expect(isHexColor('abc', true)).toBe(false);
    expect(isHexColor(undefined, true)).toBe(false);
  });
});

describe('fontStyleValue (sujet 307)', () => {
  it('bits de fontStyle, l’inverse de fontStyleBits', () => {
    expect(fontStyleValue({})).toBe(0);
    expect(fontStyleValue({ bold: true, italic: true })).toBe(3);
    for (const marks of [
      { bold: true, italic: false, underline: true, strike: false },
      { bold: false, italic: true, underline: false, strike: true },
    ])
      expect(fontStyleBits({ fontStyle: String(fontStyleValue(marks)) })).toEqual(marks);
  });
});
