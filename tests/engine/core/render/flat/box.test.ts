import { describe, expect, it } from 'vitest';
import { textAnchors } from '../../../../../src/engine/core/render/flat/box';

describe('ancrages d’un texte (sujet 383)', () => {
  it('centré par défaut ; `left` / `right`, `top` / `bottom` repris, toute autre valeur centrée', () => {
    expect(textAnchors({})).toEqual({ anchorX: 'center', anchorY: 'middle' });
    expect(textAnchors({ align: 'left', verticalAlign: 'top' })).toEqual({ anchorX: 'left', anchorY: 'top' });
    expect(textAnchors({ align: 'right', verticalAlign: 'bottom' })).toEqual({ anchorX: 'right', anchorY: 'bottom' });
    expect(textAnchors({ align: 'justify', verticalAlign: 'baseline' })).toEqual({
      anchorX: 'center',
      anchorY: 'middle',
    });
  });
});
