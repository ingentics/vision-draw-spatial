import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import { REGION_COLORS, regionTextColor } from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';
import { setup } from '../helpers';

describe('mode RDD : région (sujet 182)', () => {
  it('couleur de la région : sa palette (sujet 233), bordure grise ; réglages de table masqués', () => {
    const { run, page, shape } = setup();
    const color = rdd.gestures!.properties!.find((p) => p.key === 'rdd.regionColor')!;
    expect(rdd.gestures!.properties!.filter((p) => !p.part).map((p) => p.hidden!(page(), shape('accounts')))).toEqual([
      false,
      true,
      true,
      true,
    ]);
    expect(color.type === 'select' && color.options(page(), ['#123456']).map((o) => o.value)).toEqual([
      '#fdebef',
      '#eae4f1',
      '#e7f5fd',
      '#e7f3e7',
      '#fefce8',
      '#feefe3',
    ]);
    expect(REGION_COLORS[0]).toBe('#fdebef');
    run((edit) => color.write!(edit, shape('accounts'), '#e7f3e7'));
    expect(color.value!(page(), shape('accounts'))).toBe('#e7f3e7');
    expect(shape('accounts').style).toMatchObject({
      fillColor: '#e7f3e7',
      strokeColor: '#969696',
      labelBorderColor: '#969696',
    });
    expect(shape('accounts').style.labelBackgroundColor).toBeUndefined();
    // Fond opaque (sujet 232) : texte noir sur une couleur claire, blanc sur une sombre ; un ancien fillOpacity est
    // retiré.
    expect(shape('accounts').style.fontColor).toBe('#000000');
    run((edit) => edit.setElementStyle('accounts', 'fillOpacity', '10'));
    run((edit) => color.write!(edit, shape('accounts'), '#1f3a5f'));
    expect(shape('accounts').style.fontColor).toBe('#ffffff');
    expect(shape('accounts').style.fillOpacity).toBeUndefined();
    // Sur un fond léger (fichier d'avant), le texte se lit sur le fond posé sur du blanc.
    expect(regionTextColor('#1f3a5f', 0.1)).toBe('#000000');
  });
});
