import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { labelObject } from '../../../../src/engine/core/render/flat/box';
import { PART_ORDER } from '../../../../src/engine/core/render/types';
import type { RenderContext, TextSpec } from '../../../../src/engine/core/render/types';

describe('étiquette d’une cellule (sujet 325)', () => {
  it('objet texte nommé « label », cellule porteuse et ordre de dessin posés', () => {
    const specs: TextSpec[] = [];
    const ctx = {
      text: { create: (spec: TextSpec) => (specs.push(spec), new Object3D()) },
    } as unknown as RenderContext;
    const spec = { text: 'Nom', x: 1, y: 2 } as TextSpec;
    const object = labelObject(ctx, spec, 'cell-7');
    expect(specs).toEqual([spec]);
    expect(object.name).toBe('label');
    expect(object.userData.labelCellId).toBe('cell-7');
    expect(object.renderOrder).toBe(PART_ORDER.label);
  });
});
