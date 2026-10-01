import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { setPageOpacity } from '../../../src/engine/render/pageEffects';

describe('setPageOpacity', () => {
  it('multiplie l’opacité propre de chaque élément et la restaure exactement', () => {
    const root = new Group();
    const opaque = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ opacity: 1, transparent: true }));
    const half = new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ opacity: 0.5, transparent: true }));
    const text = Object.assign(new Group(), { fillOpacity: 0.8, sync: () => undefined });
    root.add(opaque, half, text);

    setPageOpacity(root, 0.5);
    expect((opaque.material as MeshBasicMaterial).opacity).toBe(0.5);
    expect((half.material as MeshBasicMaterial).opacity).toBe(0.25);
    expect(text.fillOpacity).toBeCloseTo(0.4);

    setPageOpacity(root, 0);
    setPageOpacity(root, 1);
    expect((opaque.material as MeshBasicMaterial).opacity).toBe(1);
    expect((half.material as MeshBasicMaterial).opacity).toBe(0.5);
    expect(text.fillOpacity).toBeCloseTo(0.8);
  });
});
