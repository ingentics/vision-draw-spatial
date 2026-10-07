import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { selectionHandles } from '../../../../src/engine/core/render/handleMeshes';

describe('selectionHandles', () => {
  // Étape 167 : à `renderOrder` égal, Three.js trie par profondeur des géométries ; en iso, la pointe des flèches
  // nord et ouest passait sous son disque.
  it('dessine les fonds avant les traits, sans dépendre de la caméra', () => {
    const group = selectionHandles({ x: 0, y: 0, width: 120, height: 60 }, 1, { resize: true, connect: true });
    expect(group.renderOrder).toBe(Number.MAX_SAFE_INTEGER);
    const meshes = group.children.filter((o): o is Mesh => o instanceof Mesh);
    const fills = meshes.filter((m) => m.name === 'fill').map((m) => m.renderOrder);
    const strokes = meshes.filter((m) => m.name === 'stroke').map((m) => m.renderOrder);
    expect(strokes.length).toBeGreaterThan(0);
    expect(Math.max(...fills)).toBeLessThan(Math.min(...strokes));
  });
});
