import { describe, expect, it } from 'vitest';
import { truncateLines } from '../../../../src/engine/core/render/textTruncate';
import type { FontSpec, MeasureText } from '../../../../src/engine/core/render/richLayout';

// Chaque caractère fait 10 de large ; une ligne fait 10 × 1,2 = 12 de haut.
const font: FontSpec = { size: 10, bold: false, italic: false };
const measure: MeasureText = (text) => text.length * 10;

describe('truncateLines (sujet 331)', () => {
  it('texte qui tient : inchangé', () => {
    expect(truncateLines('ab\ncd', 100, 100, font, measure)).toBe('ab\ncd');
  });

  it('ligne trop large : finit par « … » dans la largeur', () => {
    expect(truncateLines('abcdefgh', 50, 100, font, measure)).toBe('abcd…');
  });

  it('trop de lignes : la dernière visible finit par « … », les suivantes disparaissent', () => {
    expect(truncateLines('a\nb\nc\nd', 100, 24, font, measure)).toBe('a\nb…');
  });

  it('trop de lignes et ligne trop large : les deux', () => {
    expect(truncateLines('abcdefgh\nijklmnop\nq', 50, 24, font, measure)).toBe('abcd…\nijkl…');
  });

  it('texte vide : vide', () => {
    expect(truncateLines('', 50, 24, font, measure)).toBe('');
  });

  it('cadre plus bas qu’une ligne : une ligne reste visible', () => {
    expect(truncateLines('a\nb', 100, 3, font, measure)).toBe('a…');
  });
});
