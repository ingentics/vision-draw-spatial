import { describe, expect, it } from 'vitest';
import { TextMeasure } from '../../../../src/engine/core/render/textMeasure';
import { approximateMeasure } from '../../../../src/engine/core/render/richLayout';

describe('mesure du texte d’un moteur (sujet 377)', () => {
  const font = { size: 10, bold: false, italic: false };

  it('approchée tant que les polices ne sont pas chargées, puis la leur', () => {
    const measure = new TextMeasure();
    expect(measure.isExact).toBe(false);
    expect(measure.measure('abc', font)).toBe(approximateMeasure('abc', font));
    measure.settle((text) => text.length);
    expect(measure.isExact).toBe(true);
    expect(measure.measure('abc', font)).toBe(3);
  });

  it('deux moteurs ne partagent pas leur mesure : la plus récente ne remplace pas celle de l’autre', () => {
    const first = new TextMeasure();
    const second = new TextMeasure();
    first.settle(() => 1);
    expect(second.isExact).toBe(false);
    expect(second.measure('abc', font)).toBe(approximateMeasure('abc', font));
    second.settle(() => 2);
    expect([first.measure('abc', font), second.measure('abc', font)]).toEqual([1, 2]);
  });
});
