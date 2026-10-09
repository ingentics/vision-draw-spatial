import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { labelObject, textAnchors } from '../../../../../src/engine/core/render/flat/box';
import { PART_ORDER } from '../../../../../src/engine/core/render/types';
import type { RenderContext, TextSpec } from '../../../../../src/engine/core/render/types';

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

describe('étiquette d’une cellule (sujet 325)', () => {
  const specs: TextSpec[] = [];
  const ctx = {
    text: { create: (spec: TextSpec) => (specs.push(spec), new Object3D()) },
  } as unknown as RenderContext;

  it('objet texte nommé « label », cellule porteuse et ordre de dessin posés', () => {
    const spec = { text: 'Nom', x: 1, y: 2 } as TextSpec;
    const object = labelObject(ctx, spec, 'cell-7');
    expect(specs).toEqual([spec]);
    expect(object.name).toBe('label');
    expect(object.userData.labelCellId).toBe('cell-7');
    expect(object.renderOrder).toBe(PART_ORDER.label);
  });

  it('sans cellule porteuse (sujet 398) : ni édité en place, ni cliqué comme un label', () => {
    const object = labelObject(ctx, { text: 'Renvoi', x: 0, y: 0 } as TextSpec);
    expect('labelCellId' in object.userData).toBe(false);
    expect(object.renderOrder).toBe(PART_ORDER.label);
  });
});
