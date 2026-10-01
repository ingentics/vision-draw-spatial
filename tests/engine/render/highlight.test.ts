import { Object3D } from 'three';
import type { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { VEIL_ORDER, createVeil, liftAboveVeil } from '../../../src/engine/render/highlight';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/render/shapes/registry';
import { fixture } from '../../helpers';

const ctx = { text: { create: () => new Object3D() }, volume: { depth: 16 } };
const page = parseDrawio(fixture('drawio-desktop.drawio')).pages[0]!;
const B = 'Fs-0jHc4KjceeW8xsn6R-2';

const orders = (root: Object3D) => {
  const list: number[] = [];
  root.traverse((o) => list.push(o.renderOrder));
  return list;
};

describe('voile de sélection', () => {
  it('sombre, semi-transparent, sans test de profondeur, dessiné après le contenu de la page', () => {
    const veil = createVeil(page.bounds, 0.35);
    const plane = veil.children[0] as Mesh;
    const material = plane.material as MeshBasicMaterial;
    expect(veil.renderOrder).toBe(VEIL_ORDER);
    expect(material).toMatchObject({ opacity: 0.35, transparent: true, depthTest: false });
    const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'iso');
    expect(Math.max(...orders(scene.root))).toBeLessThan(VEIL_ORDER);
  });

  it('l’élément mis en valeur passe au-dessus du voile, volumes opaques compris', () => {
    const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'iso');
    const b = scene.root.children.find((c) => c.userData.elementId === B)!;
    const sides = b.getObjectByName('sides') as Mesh;
    expect((sides.material as MeshBasicMaterial).transparent).toBe(false);

    const restore = liftAboveVeil([b]);
    expect(Math.min(...orders(b))).toBeGreaterThan(VEIL_ORDER);
    expect((sides.material as MeshBasicMaterial).transparent).toBe(true);
    // Les autres éléments restent sous le voile.
    const a = scene.root.children.find((c) => c.userData.elementId !== B && c.userData.elementId)!;
    expect(Math.max(...orders(a))).toBeLessThan(VEIL_ORDER);

    const before = orders(scene.root);
    restore();
    expect((sides.material as MeshBasicMaterial).transparent).toBe(false);
    expect(Math.max(...orders(b))).toBeLessThan(VEIL_ORDER);
    expect(orders(scene.root)).not.toEqual(before);
  });

  it('annuler rend exactement l’état initial', () => {
    const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'iso');
    const initial = orders(scene.root);
    const restore = liftAboveVeil(scene.root.children.filter((c) => c.userData.elementId === B));
    restore();
    expect(orders(scene.root)).toEqual(initial);
  });
});
