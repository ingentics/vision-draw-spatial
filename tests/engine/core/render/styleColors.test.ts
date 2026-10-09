import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LABEL_BACKDROP,
  darken,
  hexToHsl,
  hslToHex,
  labelBackdropOf,
  labelBackdropSettings,
  lighten,
  readableOn,
  shade,
  styleColorValue,
  styleStroke,
} from '../../../../src/engine/core/render/styleColors';

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

describe('couleurs assombries (sujet 325)', () => {
  it('lighten : composantes RVB rapprochées du blanc, #rrggbb ou Color', () => {
    expect(lighten('#000000', 0.3)).toBe('#4d4d4d');
    expect(lighten(new Color('#336699'), 0)).toBe('#336699');
    expect(lighten('#336699', 1)).toBe('#ffffff');
  });

  it('shade : couleur × facteur en RVB, #rrggbb ou Color', () => {
    expect(shade('#ffffff', 0.5)).toBe(`#${new Color(0xffffff).multiplyScalar(0.5).getHexString()}`);
    expect(shade(new Color('#336699'), 1)).toBe('#336699');
    expect(shade('#336699', 0)).toBe('#000000');
  });

  it('shade et darken sont deux calculs : RVB contre luminosité HSL', () => {
    expect(shade('#336699', 0.5)).not.toBe(darken('#336699', 0.5));
    expect(darken('#ffffff', 0.5)).toBe('#808080');
  });
});

describe('valeur brute d’une couleur du style (sujet 383)', () => {
  it('`none` : null ; absente, vide ou `default` : le repli ; sinon la valeur sans espaces', () => {
    expect(styleColorValue({ fillColor: 'none' }, 'fillColor', '#ffffff')).toBeNull();
    expect(styleColorValue({}, 'fillColor', '#ffffff')).toBe('#ffffff');
    expect(styleColorValue({ fillColor: 'default' }, 'fillColor', '#ffffff')).toBe('#ffffff');
    expect(styleColorValue({ fillColor: '' }, 'fillColor', null)).toBeNull();
    expect(styleColorValue({ fillColor: ' #dae8fc ' }, 'fillColor', '#ffffff')).toBe('#dae8fc');
  });
});

describe('fond d’un label (sujet 383)', () => {
  const settings = { kind: 'halo', haloWidth: 2, haloBlur: 0.5 } as const;
  const page = '#123456';

  it('hexadécimal explicite (court ou long, casse libre) : pris tel quel, en minuscules, forme ou flèche', () => {
    expect(labelBackdropOf({ labelBackgroundColor: ' #ABC ' }, true, settings, page)).toEqual({ background: '#abc' });
    expect(labelBackdropOf({ labelBackgroundColor: '#AABBCC' }, false, settings, page)).toEqual({
      background: '#aabbcc',
    });
  });

  it('flèche sans fond hexadécimal : halo de la couleur de la page, fond uni, ou rien, selon les réglages', () => {
    expect(labelBackdropOf({ labelBackgroundColor: 'default' }, true, settings, page)).toEqual({
      halo: { color: page, width: 2, blur: 0.5 },
    });
    expect(labelBackdropOf({}, true, { ...settings, kind: 'solid' }, page)).toEqual({ background: page });
    expect(labelBackdropOf({}, true, { ...settings, kind: 'none' }, page)).toEqual({});
    expect(labelBackdropOf({}, true)).toEqual({
      halo: { color: '#ffffff', width: DEFAULT_LABEL_BACKDROP.haloWidth, blur: DEFAULT_LABEL_BACKDROP.haloBlur },
    });
  });

  it('forme : `default` = fond de la page ; absent, nom de couleur ou `none` : aucun fond', () => {
    expect(labelBackdropOf({ labelBackgroundColor: 'Default' }, false, settings, page)).toEqual({ background: page });
    expect(labelBackdropOf({}, false, settings, page)).toEqual({});
    expect(labelBackdropOf({ labelBackgroundColor: 'red' }, false, settings, page)).toEqual({});
    expect(labelBackdropOf({ labelBackgroundColor: 'none' }, false, settings, page)).toEqual({});
  });

  it('réglages lus des paramètres `shapes.edgeLabel…`', () => {
    expect(labelBackdropSettings({ edgeLabelBackdrop: 'solid', edgeLabelHaloWidth: 3, edgeLabelHaloBlur: 0 })).toEqual({
      kind: 'solid',
      haloWidth: 3,
      haloBlur: 0,
    });
  });
});

describe('conversions HSL pures (sujet 383)', () => {
  it('#rrggbb → teinte en degrés, saturation, luminosité, et retour', () => {
    expect(hexToHsl('#ff0000')).toEqual([0, 1, 0.5]);
    expect(hexToHsl('#808080')).toEqual([0, 0, 128 / 255]);
    const [h, s, l] = hexToHsl('#6c8ebf');
    expect(hslToHex(h, s, l)).toBe('#6c8ebf');
    expect(hslToHex(120, 1, 0.25)).toBe('#008000');
  });
});
