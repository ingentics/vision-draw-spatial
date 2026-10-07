import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { setElementsDim, setPageOpacity } from '../../../../src/engine/core/render/pageEffects';

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

describe('setElementsDim (modes de page, sujet 81)', () => {
  it('estompe des éléments, cumulé avec le fondu de la page, et revient exactement', () => {
    const root = new Group();
    const mesh = () => new Mesh(new PlaneGeometry(), new MeshBasicMaterial({ opacity: 1, transparent: false }));
    const kept = Object.assign(new Group(), { userData: { elementId: 'a' } });
    const dimmed = Object.assign(new Group(), { userData: { elementId: 'b' } });
    kept.add(mesh());
    dimmed.add(mesh());
    root.add(kept, dimmed);
    const opacity = (group: Group) => ((group.children[0] as Mesh).material as MeshBasicMaterial).opacity;

    expect(setElementsDim(root, (id) => (id === 'b' ? 0.3 : 1))).toBe(true);
    expect([opacity(kept), opacity(dimmed)]).toEqual([1, 0.3]);
    expect(((dimmed.children[0] as Mesh).material as MeshBasicMaterial).transparent).toBe(true);
    expect(setElementsDim(root, (id) => (id === 'b' ? 0.3 : 1))).toBe(false);

    setPageOpacity(root, 0.5);
    expect([opacity(kept), opacity(dimmed)]).toEqual([0.5, 0.15]);
    setPageOpacity(root, 1);
    setElementsDim(root, () => 1);
    expect([opacity(kept), opacity(dimmed)]).toEqual([1, 1]);
    expect(((dimmed.children[0] as Mesh).material as MeshBasicMaterial).transparent).toBe(false);
  });
});
