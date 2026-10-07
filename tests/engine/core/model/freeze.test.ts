import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { PageEffectRegistry } from '../../../../src/engine/core/effects/registry';
import { freezePlain } from '../../../../src/engine/core/model/freeze';
import { PageModeRegistry } from '../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../src/engine/core/modes/types';
import type { ShapeDefinition } from '../../../../src/engine/core/plugins';
import { ShapeRegistry } from '../../../../src/engine/core/shapes/registry';

describe('gel des objets simples (sujet 303)', () => {
  it('objets littéraux et tableaux gelés en profondeur ; fonctions et objets d’une classe laissés tels quels', () => {
    const color = new Color('#ff0000');
    const value = freezePlain({ list: [{ a: 1 }], nested: { b: 2 }, color, run: () => 1 });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(Object.isFrozen(value.color)).toBe(false);
    expect(() => {
      (value.nested as { b: number }).b = 3;
    }).toThrow(TypeError);
    color.set('#00ff00');
    expect(color.getHexString()).toBe('00ff00');
  });

  it('définitions des plugins gelées à l’enregistrement : un plugin ne modifie pas celle d’un autre', () => {
    const mode: PageModeDefinition = { id: 'm', namespace: 'm', name: 'M', page: { viewModes: ['top'] } };
    new PageModeRegistry().register(mode);
    expect(() => mode.page!.viewModes!.push('iso')).toThrow(TypeError);
    const shape: ShapeDefinition = { id: 's', flat: { create: () => new Color() as never }, kinds: ['s'] };
    new ShapeRegistry().register(shape);
    expect(() => {
      (shape as { id: string }).id = 'autre';
    }).toThrow(TypeError);
    const effect = { id: 'e', name: 'E', viewModes: ['iso' as const] };
    new PageEffectRegistry().register(effect);
    expect(() => effect.viewModes.push('iso')).toThrow(TypeError);
  });
});
