import { Object3D } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { ERROR_COLOR, EXIT_COLOR } from '../../../../../../src/engine/plugins/modes/states/exits/exitKind';
import { definition } from '../../../../../../src/engine/plugins/modes/states/shapes/final';
import { MEASURE } from '../../../../../helpers';
import { setup } from '../helpers';

/** Couleur du disque central d'un point de sortie de la fixture. */
function dotColor(id: string): string {
  const group = definition.flat.create(setup().shape(id), { ...MEASURE, text: { create: () => new Object3D() } });
  const dot = group.children.at(-1) as Mesh;
  return `#${(dot.material as MeshBasicMaterial).color.getHexString()}`;
}

describe('mode Machine à états : point de sortie (sujets 433, 440)', () => {
  it('noir pour une sortie attendue, rouge pour une sortie en erreur', () => {
    expect(dotColor('final1')).toBe(EXIT_COLOR);
    expect(dotColor('final5')).toBe(ERROR_COLOR);
  });

  it('sans style à choisir, taille fixe', () => {
    expect(definition.styleable).toBe(false);
    expect(definition.resizable).toBe(false);
  });
});
