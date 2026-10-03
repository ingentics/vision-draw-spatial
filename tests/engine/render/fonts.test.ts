import { describe, expect, it } from 'vitest';
import { pickFont } from '../../../src/engine/render/troikaText';

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
});
