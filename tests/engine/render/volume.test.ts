import { Box3, Object3D } from 'three';
import type { BufferGeometry, MeshBasicMaterial, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { pickElement } from '../../../src/engine/interaction/pick';
import { blockHeight } from '../../../src/engine/render/iso/block';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/render/shapes/registry';
import type { RenderContext } from '../../../src/engine/render/types';
import { fixture } from '../../helpers';

const ctx: RenderContext = { text: { create: () => new Object3D() }, volume: { depth: 20 } };
const page = parseDrawio(fixture('drawio-desktop.drawio')).pages[0]!;
const A = 'Fs-0jHc4KjceeW8xsn6R-1';
const B = 'Fs-0jHc4KjceeW8xsn6R-2';

const isoScene = (p = page) => {
  const scene = buildPageScene(p, createDefaultRegistry(), ctx, 'iso');
  scene.root.updateMatrixWorld(true);
  return scene;
};
const element = (root: Object3D, id: string) => root.children.find((c) => c.userData.elementId === id)!;

describe('volumes iso', () => {
  it('un rectangle devient un bloc : de Y = 0 à Y = épaisseur, sur son emprise', () => {
    const box = new Box3().setFromObject(element(isoScene().root, B).getObjectByName('sides')!);
    expect(box.min.toArray().map((v) => +v.toFixed(6))).toEqual([440, 0, 200]);
    expect(box.max.toArray().map((v) => +v.toFixed(6))).toEqual([560, 20, 280]);
  });

  it('dessus opaque à la hauteur du bloc, bordure juste au-dessus', () => {
    const b = element(isoScene().root, B);
    const top = new Box3().setFromObject(b.getObjectByName('top')!);
    expect(top.min.y).toBeCloseTo(20);
    expect(((b.getObjectByName('top') as Mesh).material as MeshBasicMaterial).depthWrite).toBe(true);
    expect(new Box3().setFromObject(b.getObjectByName('stroke')!).min.y).toBeGreaterThan(20);
  });

  it('côtés ombrés : deux faces d’orientations différentes n’ont pas la même teinte', () => {
    const sides = element(isoScene().root, B).getObjectByName('sides') as Mesh;
    const colors = (sides.geometry as BufferGeometry).getAttribute('color');
    const shades = new Set<number>();
    for (let face = 0; face < 4; face++) shades.add(+colors.getX(face * 6).toFixed(3));
    expect(shades.size).toBeGreaterThan(1);
  });

  it('hauteur par forme : style spatial.height, sinon l’épaisseur des paramètres', () => {
    const shape = page.shapes[0]!;
    expect(blockHeight(shape, ctx)).toBe(20);
    expect(blockHeight({ ...shape, style: { ...shape.style, 'spatial.height': '42' } }, ctx)).toBe(42);
  });

  it('formes contenues posées sur le dessus de leur conteneur ; arêtes à la hauteur de leurs extrémités', () => {
    const groups = parseDrawio(fixture('groups.drawio')).pages[0]!;
    const scene = isoScene(groups);
    expect(element(scene.root, 'lane').position.z).toBe(0);
    expect(element(scene.root, 'lane-a').position.z).toBe(20);
    expect(element(scene.root, 'port').position.z).toBe(40); // sur « API », elle-même sur le conteneur
    expect(element(scene.root, 'lane-edge').position.z).toBe(20);
    // Les groupes n'ont pas de volume : « deep » reste au sol.
    expect(element(scene.root, 'deep').position.z).toBe(0);
  });

  it('forme sans fond : reste à plat (pas de volume fantôme)', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    const scene = isoScene(simple);
    expect(element(scene.root, 't1').getObjectByName('sides')).toBeUndefined();
  });

  it('à plat (niveau flat), rien n’est surélevé', () => {
    const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'flat');
    expect(element(scene.root, A).getObjectByName('sides')).toBeUndefined();
    expect(element(scene.root, A).position.z).toBe(0);
  });
});

describe('pickElement avec volumes', () => {
  it('le clic vise le dessus du bloc (point décalé vers la caméra), pas son emprise au sol', () => {
    // Point du sol juste sous le bloc B (y = 300 : hors de son emprise 200–280) ;
    // à 20 px de haut, la vue arrive 30 px plus loin vers le haut de la page : dans B.
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      heightOf: (id: string) => (id === B ? 20 : 0),
      pointAtHeight: (height: number) => ({ x: 500, y: 300 - height * 1.5 }),
    };
    expect(pickElement(page, { x: 500, y: 300 }, options)?.element.id).toBe(B);
    expect(pickElement(page, { x: 500, y: 300 }, { ...options, heightOf: () => 0 })).toBeUndefined();
  });
});
