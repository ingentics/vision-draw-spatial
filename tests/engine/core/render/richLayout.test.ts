import { describe, expect, it } from 'vitest';
import {
  decorationLines,
  fitFontSize,
  layoutRichText,
  scaleRichLines,
} from '../../../../src/engine/core/render/richLayout';
import type { MeasureText } from '../../../../src/engine/core/render/richLayout';

/** 1 px par caractère et par point de taille / 10 : largeurs faciles à vérifier. */
const measure: MeasureText = (text, font) => (text.length * font.size) / 10;
const base = { size: 10, bold: false, italic: false, underline: false, strike: false };

describe('mise en page du texte riche', () => {
  it('segments côte à côte sur la même ligne de base, taille de ligne = plus grande taille', () => {
    const layout = layoutRichText([[{ text: 'ab' }, { text: 'cd', fontSize: 20, bold: true }]], base, measure, {
      align: 'left',
    });
    expect(layout.runs.map(({ text, x, baseline, size, bold }) => ({ text, x, baseline, size, bold }))).toEqual([
      { text: 'ab', x: 0, baseline: 20 * 0.942, size: 10, bold: false },
      { text: 'cd', x: 2, baseline: 20 * 0.942, size: 20, bold: true },
    ]);
    expect(layout.width).toBe(6);
    expect(layout.height).toBeCloseTo(24);
  });

  it('lignes vides en tête, au milieu et en fin : une hauteur de ligne chacune (sujet 407)', () => {
    const lines = [[], [{ text: 'a' }], [{ text: '' }], [{ text: 'b' }], []];
    const layout = layoutRichText(lines, base, measure, { align: 'center' });
    expect(layout.height).toBeCloseTo(5 * 12);
    expect(layout.runs.map(({ text, baseline }) => ({ text, baseline }))).toEqual([
      { text: 'a', baseline: 12 + 10 * 0.942 },
      { text: 'b', baseline: 36 + 10 * 0.942 },
    ]);
  });

  it('lignes centrées ou à droite dans la largeur du bloc', () => {
    const lines = [[{ text: 'aaaa' }], [{ text: 'bb' }]];
    expect(layoutRichText(lines, base, measure, { align: 'center' }).runs[1]!.x).toBe(1);
    expect(layoutRichText(lines, base, measure, { align: 'right' }).runs[1]!.x).toBe(2);
  });

  it('retour à la ligne entre les mots, espaces de bord retirés', () => {
    const layout = layoutRichText([[{ text: 'un deux ' }, { text: 'trois', italic: true }]], base, measure, {
      maxWidth: 6,
      align: 'left',
    });
    const lines = new Map<number, string>();
    for (const run of layout.runs) lines.set(run.baseline, (lines.get(run.baseline) ?? '') + run.text);
    expect([...lines.values()]).toEqual(['un', 'deux', 'trois']);
    expect(layout.width).toBe(5);
  });

  it('souligné sous la ligne de base, barré au-dessus', () => {
    const [run] = layoutRichText([[{ text: 'x', underline: true, strike: true }]], base, measure, {
      align: 'left',
    }).runs;
    const [under, strike] = decorationLines(run!);
    expect(under!.y).toBeGreaterThan(run!.baseline);
    expect(strike!.y).toBeLessThan(run!.baseline);
  });
});

describe('taille « Ajuster » (étape 57)', () => {
  const zone = (width: number, height: number, wrap = false) => ({ width, height, wrap, align: 'center' as const });

  it('un texte qui tient garde la taille réglée (jamais agrandi)', () => {
    expect(fitFontSize([[{ text: 'abc' }]], base, measure, zone(100, 100))).toBe(10);
    expect(fitFontSize([[{ text: 'abc' }]], { ...base, size: 10.5 }, measure, zone(100, 100))).toBe(10.5);
  });

  it('trop large : plus grande taille entière qui tient en largeur', () => {
    // 10 caractères : largeur = taille.
    expect(fitFontSize([[{ text: 'aaaaaaaaaa' }]], base, measure, zone(6.5, 100))).toBe(6);
  });

  it('trop haut : plus grande taille entière qui tient en hauteur (interligne 1,2)', () => {
    expect(fitFontSize([[{ text: 'a' }], [{ text: 'b' }]], base, measure, zone(100, 12))).toBe(5);
  });

  it('avec retour à la ligne : la réduction peut éviter une ligne', () => {
    // « aa bb » : 0,5 × taille de large ; à 8, il tient sur une ligne de 4 ; à 9, deux lignes (21,6 > 20).
    expect(fitFontSize([[{ text: 'aa bb' }]], base, measure, zone(4, 20, true))).toBe(8);
  });

  it('pas sous 1 : le texte déborde', () => {
    expect(fitFontSize([[{ text: 'aaaa' }]], base, measure, zone(0.1, 0.1))).toBe(1);
  });

  it('texte riche : les tailles partielles gardent leur rapport à la taille de base', () => {
    const lines = [[{ text: 'ab' }, { text: 'cd', fontSize: 20 }]];
    // Largeur = 0,2 × s + 0,4 × s = 0,6 × s.
    expect(fitFontSize(lines, base, measure, zone(3, 100))).toBe(5);
    expect(scaleRichLines(lines, 0.5)).toEqual([[{ text: 'ab' }, { text: 'cd', fontSize: 10 }]]);
  });
});
