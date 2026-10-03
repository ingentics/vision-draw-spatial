import type { MeshBasicMaterial } from 'three';
import { Box3, Mesh, Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { ShapeRegistry, createDefaultRegistry } from '../../../src/engine/render/shapes/registry';
import type { ShapeDefinition } from '../../../src/engine/render/shapes/types';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
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
  /** `simple.drawio` avec « Stockage » changé en forme inconnue du moteur (`shape=cube`). */
  const withUnknownShape = () => {
    const page = parseDrawio(fixture('simple.drawio')).pages[0]!;
    page.shapes.find((s) => s.id === 'c1')!.kind = 'cube';
    return page;
  };

  it('formes inconnues : placeholder gris', () => {
    const { ctx, texts } = stubContext();
    const scene = buildPageScene(withUnknownShape(), createDefaultRegistry(), ctx);
    expect(texts.some((t) => t.text === 'Stockage\n[cube]')).toBe(true);
    const fill = element(scene.root, 'c1').getObjectByName('fill') as Mesh;
    expect((fill.material as MeshBasicMaterial).color.getHexString()).toBe('eeeeee');
  });

  it('formes inconnues en iso : le rendu 2D sur un bloc gris en pointillés', () => {
    const { ctx, texts } = stubContext();
    const scene = buildPageScene(withUnknownShape(), createDefaultRegistry(), ctx, 'iso');
    expect(texts.some((t) => t.text === 'Stockage\n[cube]' && t.color.getHexString() === '616161')).toBe(true);
    const block = element(scene.root, 'c1');
    const color = (name: string) => ((block.getObjectByName(name) as Mesh).material as MeshBasicMaterial).color;
    expect(color('top').getHexString()).toBe('eeeeee');
    expect(color('stroke').getHexString()).toBe('9e9e9e');
    // Pointillés : les arêtes du volume (dessus, bas, verticales) sont en tirets.
    for (const name of ['stroke', 'stroke-bottom', 'stroke-vertical']) {
      expect(((block.getObjectByName(name) as Mesh).material as MeshBasicMaterial & { dashed: boolean }).dashed).toBe(
        true,
      );
    }
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
    const custom: ShapeDefinition = {
      kind: 'cylinder3',
      flat: { create: () => Object.assign(new Object3D(), { name: 'custom' }) },
    };
    const { scene } = build('simple.drawio', createDefaultRegistry().register(custom));
    expect(element(scene.root, 'c1').name).toBe('custom');
  });

  it('dispose libère géométries et matériaux', () => {
    const { scene } = build('drawio-desktop.drawio');
    let disposed = 0;
    scene.root.traverse((o) => {
      if (o instanceof Mesh) o.geometry.addEventListener('dispose', () => disposed++);
    });
    scene.dispose();
    expect(disposed).toBe(8); // 3 formes × (fond + bordure) + flèche (ligne + pointe)
  });
});

describe('buildPageScene — arêtes', () => {
  it('test.drawio : la flèche A → C est dessinée sous les formes', () => {
    const { scene } = build('drawio-desktop.drawio');
    const arrow = element(scene.root, 'Fs-0jHc4KjceeW8xsn6R-4');
    expect(arrow.name).toBe('edge:Fs-0jHc4KjceeW8xsn6R-4');
    const parts = arrow.children.map((c) => c.name);
    expect(parts).toEqual(['stroke', 'fill']); // ligne + pointe classic
    const shapeOrder = element(scene.root, 'Fs-0jHc4KjceeW8xsn6R-1').getObjectByName('fill')!.renderOrder;
    expect(arrow.getObjectByName('stroke')!.renderOrder).toBeLessThan(shapeOrder);
    // La pointe touche le bord gauche de C (x = 280, y = 440).
    const tip = new Box3().setFromObject(arrow.getObjectByName('fill')!);
    expect(tip.max.x).toBeCloseTo(280);
    expect((tip.min.z + tip.max.z) / 2).toBeCloseTo(440);
  });

  it('labels d’arête : principal et enfants, sans fond mais avec un halo blanc par défaut', () => {
    const { texts } = build('simple.drawio');
    const appelle = texts.find((t) => t.text === 'appelle')!;
    expect(appelle).toMatchObject({ anchorX: 'center', anchorY: 'middle' });
    expect(appelle.background).toBeUndefined();
    expect(appelle.halo).toMatchObject({ width: 1.5, blur: 1 });
    expect(appelle.halo!.color.getHexString()).toBe('ffffff');
    expect(texts.find((t) => t.text === 'lit')).toBeDefined();
  });

  it('labels d’arête : fond uni ou aucun selon le paramètre ; une couleur de fond explicite l’emporte', () => {
    const xml = `<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" value="a" style="html=1;" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="50" y="0" as="targetPoint"/></mxGeometry>
      </mxCell>
      <mxCell id="f" value="b" style="html=1;labelBackgroundColor=#ffcc00;" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="20" as="sourcePoint"/><mxPoint x="50" y="20" as="targetPoint"/></mxGeometry>
      </mxCell></root></mxGraphModel></diagram></mxfile>`;
    const page = parseDrawio(xml).pages[0]!;
    for (const kind of ['solid', 'none'] as const) {
      const { ctx, texts } = stubContext();
      buildPageScene(page, createDefaultRegistry(), { ...ctx, edgeLabelBackdrop: { kind, haloWidth: 2, haloBlur: 0 } });
      const a = texts.find((t) => t.text === 'a')!;
      expect(a.halo).toBeUndefined();
      expect(a.background?.getHexString()).toBe(kind === 'solid' ? 'ffffff' : undefined);
      expect(texts.find((t) => t.text === 'b')!.background?.getHexString()).toBe('ffcc00');
    }
  });

  it('arête sans flèche (endArrow=none) en pointillés', () => {
    const { scene } = build('simple.drawio');
    const a3 = element(scene.root, 'a3');
    expect(a3.children.map((c) => c.name)).toEqual(['stroke']);
  });

  it('style d’arête inconnu : approché (dessiné quand même)', () => {
    const xml = `<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" style="edgeStyle=isometricEdgeStyle;endArrow=ERmandOne;" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="50" y="50" as="targetPoint"/></mxGeometry>
      </mxCell></root></mxGraphModel></diagram></mxfile>`;
    const { ctx } = stubContext();
    const scene = buildPageScene(parseDrawio(xml).pages[0]!, createDefaultRegistry(), ctx);
    expect(element(scene.root, 'e').children.map((c) => c.name)).toEqual(['stroke', 'fill']);
  });
});

describe('buildPageScene — liens', () => {
  it('pastille sur les formes liées (page ou URL), pas sur les autres', () => {
    const { scene } = build('links.drawio');
    expect(element(scene.root, 'to-detail').getObjectByName('link-badge')).toBeDefined();
    expect(element(scene.root, 'ext').getObjectByName('link-badge')).toBeDefined();
    expect(element(scene.root, 'action').getObjectByName('link-badge')).toBeUndefined();
  });

  it('les arêtes gardent leur tracé pour la sélection', () => {
    const { scene } = build('drawio-desktop.drawio');
    expect(element(scene.root, 'Fs-0jHc4KjceeW8xsn6R-4').userData.route).toEqual([
      { x: 180, y: 280 },
      { x: 180, y: 440 },
      { x: 280, y: 440 },
    ]);
  });
});

describe('ShapeRegistry', () => {
  it('sans définition : placeholder, non supporté', () => {
    const { page } = build('drawio-desktop.drawio', new ShapeRegistry());
    const resolved = new ShapeRegistry().resolve(page.shapes[0]!);
    expect(resolved).toMatchObject({ supported: false, definition: { kind: 'placeholder' } });
  });
});
