import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { readableOn, styleStroke } from '../../../../src/engine/core/render/styleColors';

describe('couleurs d’un style (sujet 307)', () => {
  it('trait : couleur, opacité, épaisseur et pointillés ; aucun sans couleur ni épaisseur', () => {
    const stroke = styleStroke(
      { strokeColor: '#ff0000', strokeWidth: '2', strokeOpacity: '50', dashed: '1' },
      '#000000',
    )!;
    expect([stroke.color.getHexString(), stroke.opacity, stroke.width, stroke.dash]).toEqual([
      'ff0000',
      0.5,
      2,
      [6, 6],
    ]);
    expect(styleStroke({}, '#000000')).toMatchObject({ opacity: 1, width: 1, dash: undefined });
    expect(styleStroke({ strokeColor: 'none' }, '#000000')).toBeUndefined();
    expect(styleStroke({ strokeWidth: '0' }, '#000000')).toBeUndefined();
    expect(styleStroke({}, null)).toBeUndefined();
  });

  it('texte lisible : sur un #rrggbb ou une couleur, et sur un fond translucide posé sur la page blanche', () => {
    expect(readableOn('#1f3a5f')).toBe('#ffffff');
    expect(readableOn(new Color('#1f3a5f'))).toBe('#ffffff');
    expect(readableOn('#1f3a5f', 0.1)).toBe('#000000');
    expect(readableOn('#ffffff')).toBe('#000000');
  });
});
