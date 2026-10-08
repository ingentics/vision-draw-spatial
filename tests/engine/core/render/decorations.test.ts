import type { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { darken, lighten, partSelection, shade } from '../../../../src/engine/core/render/decorations';

describe('mise en valeur d’une partie de forme', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 20 };
  const opacities = (group: ReturnType<typeof partSelection>) =>
    group.children.map((child) => ((child as Mesh).material as MeshBasicMaterial).opacity);

  it('sélectionnée (sujet 249) : fond à 15 % et trait plein', () => {
    const selected = partSelection(bounds, 1);
    expect(selected.name).toBe('part-selection');
    expect(opacities(selected)).toEqual([0.15, 1]);
  });

  it('survolée (sujet 259) : fond plus léger, à 7 %, trait fin à demi transparent', () => {
    const hover = partSelection(bounds, 1, undefined, true);
    expect(hover.name).toBe('part-hover');
    expect(opacities(hover)).toEqual([0.07, 0.5]);
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
