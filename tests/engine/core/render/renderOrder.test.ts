import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { liftAboveVeil } from '../../../../src/engine/core/render/veil';
import { followRenderOrder } from '../../../../src/engine/core/render/renderOrder';

describe('fond des labels', () => {
  it('reste juste sous son texte, même créé pendant une mise en valeur puis retirée', () => {
    const text = new Object3D();
    text.renderOrder = 26;
    const restore = liftAboveVeil([text]);
    // Le fond arrive après coup (mise en page asynchrone), pendant que le texte est au-dessus du voile.
    const background = new Object3D();
    followRenderOrder(background, text);
    text.add(background);
    expect(background.renderOrder).toBe(text.renderOrder - 0.5);
    restore();
    expect(text.renderOrder).toBe(26);
    expect(background.renderOrder).toBe(25.5);
  });
});
