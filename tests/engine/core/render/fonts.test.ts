import { describe, expect, it } from 'vitest';
import { pickFont } from '../../../../src/engine/core/render/troikaText';

describe('pickFont', () => {
  const all = { regular: 'r', bold: 'b', italic: 'i', boldItalic: 'bi' };

  it('choisit la variante demandée', () => {
    expect(pickFont(all, false, false)).toBe('r');
    expect(pickFont(all, true, false)).toBe('b');
    expect(pickFont(all, false, true)).toBe('i');
    expect(pickFont(all, true, true)).toBe('bi');
  });

  it('sinon la plus proche disponible, puis la police normale', () => {
    expect(pickFont({ regular: 'r', bold: 'b' }, true, true)).toBe('b');
    expect(pickFont({ regular: 'r' }, false, true)).toBe('r');
    expect(pickFont({}, true, false)).toBeNull();
  });

  it('police nommée choisie par fontFamily, en gras comme en normal ; inconnue : Roboto (sujet 476)', () => {
    const fonts = { ...all, families: { 'Permanent Marker': 'pm' } };
    expect(pickFont(fonts, true, false, 'Permanent Marker')).toBe('pm');
    expect(pickFont(fonts, false, true, 'Permanent Marker')).toBe('pm');
    expect(pickFont(fonts, true, false, 'Comic Sans MS')).toBe('b');
    expect(pickFont(all, false, false, 'Permanent Marker')).toBe('r');
  });
});
