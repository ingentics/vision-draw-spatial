import { describe, expect, it } from 'vitest';
import { decorationLines, layoutRichText } from '../../../src/engine/render/richLayout';
import type { MeasureText } from '../../../src/engine/render/richLayout';

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
