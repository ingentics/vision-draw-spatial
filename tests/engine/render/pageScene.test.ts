import type { MeshBasicMaterial } from 'three';
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { RendererRegistry, createDefaultRegistry } from '../../../src/engine/render/registry';
import type { RenderContext, ShapeRenderer, TextSpec } from '../../../src/engine/render/types';
import { fixture } from '../../helpers';

/** Fabrique de texte factice : garde la spec pour inspection. */
function stubContext() {
  const texts: TextSpec[] = [];
  const ctx: RenderContext = {
    text: {
      create(spec) {
        texts.push(spec);
        const object = new Object3D();
        object.userData.spec = spec;
        return object;
      },
    },
  };
  return { ctx, texts };
}

function build(file: string, registry = createDefaultRegistry()) {
  const { ctx, texts } = stubContext();
  const page = parseDrawio(fixture(file)).pages[0]!;
  const scene = buildPageScene(page, registry, ctx);
  scene.root.updateMatrixWorld(true);
  return { scene, texts, page };
}

function element(root: Object3D, id: string): Object3D {
  const found = root.children.find((c) => c.userData.elementId === id);
  if (!found) throw new Error(`élément ${id} absent`);
  return found;
}

function worldBox(object: Object3D, part: string): Box3 {
  const mesh = object.getObjectByName(part);
  if (!mesh) throw new Error(`partie ${part} absente`);
  return new Box3().setFromObject(mesh);
}

describe('buildPageScene — drawio-desktop.drawio', () => {
  const { scene, texts } = build('drawio-desktop.drawio');
  const A = 'Fs-0jHc4KjceeW8xsn6R-1';
  const B = 'Fs-0jHc4KjceeW8xsn6R-2';

  it('repère : x → X, y → Z, posé au sol (Y = 0)', () => {
    const box = worldBox(element(scene.root, A), 'fill');
    expect(box.min.toArray()).toEqual([120, 0, 200]);
    expect(box.max.toArray()).toEqual([240, 0, 280]);
  });

  it('bordure de 1 px centrée sur le bord', () => {
    const box = worldBox(element(scene.root, B), 'stroke');
    expect(box.min.x).toBeCloseTo(439.5);
    expect(box.max.z).toBeCloseTo(280.5);
  });

  it('couleurs du style et défauts draw.io', () => {
    const fillOf = (id: string) =>
      ((element(scene.root, id).getObjectByName('fill') as Mesh).material as MeshBasicMaterial).color.getHexString();
    const strokeOf = (id: string) =>
      ((element(scene.root, id).getObjectByName('stroke') as Mesh).material as MeshBasicMaterial).color.getHexString();
    expect(fillOf(B)).toBe('f8cecc');
    expect(strokeOf(B)).toBe('b85450');
    expect(fillOf(A)).toBe('ffffff');
    expect(strokeOf(A)).toBe('000000');
  });

  it('label centré dans la forme', () => {
    expect(texts.find((t) => t.text === 'A')).toMatchObject({
      x: 180,
      y: 240,
      anchorX: 'center',
      anchorY: 'middle',
      fontSize: 11,
      maxWidth: 116,
    });
  });

  it('A pointillé : bordure découpée en plusieurs tirets', () => {
    const dashed = (element(scene.root, A).getObjectByName('stroke') as Mesh).geometry.getAttribute('position').count;
    const solid = (element(scene.root, B).getObjectByName('stroke') as Mesh).geometry.getAttribute('position').count;
    expect(dashed).toBeGreaterThan(solid * 10);
  });

  it('ordre de dessin : remplissage < bordure < label, et formes dans l’ordre du document', () => {
    const order = (id: string, part: string) => element(scene.root, id).getObjectByName(part)!.renderOrder;
    expect(order(A, 'fill')).toBeLessThan(order(A, 'stroke'));
    expect(order(A, 'stroke')).toBeLessThan(order(A, 'label'));
    expect(order(A, 'label')).toBeLessThan(order(B, 'fill'));
  });
});

describe('buildPageScene — formes', () => {
  it('formes inconnues : placeholder gris, comptées', () => {
    const { scene, texts } = build('simple.drawio');
    expect([...scene.unsupported]).toEqual([['cylinder3', 1]]);
    expect(texts.some((t) => t.text === 'Stockage\n[cylinder3]')).toBe(true);
    const fill = element(scene.root, 'c1').getObjectByName('fill') as Mesh;
    expect((fill.material as MeshBasicMaterial).color.getHexString()).toBe('eeeeee');
  });

  it('texte seul : ni fond ni bordure', () => {
    const { scene } = build('simple.drawio');
    const text = element(scene.root, 't1');
    expect(text.getObjectByName('fill')).toBeUndefined();
    expect(text.getObjectByName('stroke')).toBeUndefined();
    expect(text.getObjectByName('label')).toBeDefined();
  });

  it('groupes invisibles, enfants à leur position absolue', () => {
    const { scene } = build('groups.drawio');
    expect(element(scene.root, 'g-outer').children).toHaveLength(0);
    const box = worldBox(element(scene.root, 'deep'), 'fill');
    expect(box.min).toEqual(new Vector3(65, 0, 315));
  });

  it('calques cachés et formes cachées ne sont pas construits', () => {
    const { scene } = build('layers.drawio');
    const ids = scene.root.children.map((c) => c.userData.elementId);
    expect(ids).toEqual(['base-shape']);
  });

  it('un renderer enregistré après les autres est prioritaire', () => {
    const custom: ShapeRenderer = {
      kind: 'cylinder3',
      create: () => Object.assign(new Object3D(), { name: 'custom' }),
    };
    const { scene } = build('simple.drawio', createDefaultRegistry().register(custom));
    expect(element(scene.root, 'c1').name).toBe('custom');
    expect(scene.unsupported.size).toBe(0);
  });

  it('dispose libère géométries et matériaux', () => {
    const { scene } = build('drawio-desktop.drawio');
    let disposed = 0;
    scene.root.traverse((o) => {
      if (o instanceof Mesh) o.geometry.addEventListener('dispose', () => disposed++);
    });
    scene.dispose();
    expect(disposed).toBe(6);
  });
});

describe('RendererRegistry', () => {
  it('sans renderer : placeholder, non supporté', () => {
    const { page } = build('drawio-desktop.drawio', new RendererRegistry());
    const resolved = new RendererRegistry().resolve(page.shapes[0]!);
    expect(resolved).toMatchObject({ supported: false, renderer: { kind: 'placeholder' } });
  });
});
