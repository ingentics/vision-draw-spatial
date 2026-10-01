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

  it('toutes les arêtes du bloc ont la couleur et le style de la bordure 2D', () => {
    const b = element(isoScene().root, B);
    const color = (name: string) =>
      ((b.getObjectByName(name) as Mesh).material as MeshBasicMaterial).color.getHexString();
    expect(color('stroke')).toBe('b85450'); // contour du dessus (rendu à plat)
    expect(color('stroke-bottom')).toBe('b85450');
    const vertical = b.getObjectByName('stroke-vertical')!;
    const ribbons = vertical.children as Mesh[];
    expect(ribbons.map((r) => (r.material as MeshBasicMaterial).color.getHexString())).toEqual(Array(4).fill('b85450'));
    // 4 coins → 4 rubans plats (un quadrilatère chacun), tournés face à l'écran par le moteur.
    expect(ribbons.map((r) => r.geometry.getAttribute('position').count)).toEqual([6, 6, 6, 6]);
    expect(ribbons.every((r) => r.userData.billboard === true)).toBe(true);
    const box = new Box3().setFromObject(vertical);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.y).toBeCloseTo(20, 1); // jusqu'au contour du dessus (posé 0,05 px au-dessus)
  });

  it('arêtes tracées à l’extérieur de la forme, sur toute leur épaisseur', () => {
    const b = element(isoScene().root, B);
    // B : emprise x 440–560, bordure de 1 px → arêtes entre 439 et 440 (et 560–561).
    for (const name of ['stroke', 'stroke-bottom', 'stroke-vertical']) {
      const box = new Box3().setFromObject(b.getObjectByName(name)!);
      expect(box.min.x).toBeCloseTo(439);
      expect(box.max.x).toBeCloseTo(561);
    }
  });

  it('arêtes pointillées comme la bordure 2D (A est en pointillés)', () => {
    const a = element(isoScene().root, A);
    const ribbon = a.getObjectByName('stroke-vertical')!.children[0] as Mesh;
    // Plusieurs tirets par arête verticale au lieu d'un seul ruban plein.
    expect(ribbon.geometry.getAttribute('position').count).toBeGreaterThan(6);
  });

  it('ruban vertical : largeur exacte face à l’écran, quelle que soit la rotation de la vue', () => {
    const b = element(isoScene().root, B);
    const ribbon = b.getObjectByName('stroke-vertical')!.children[0] as Mesh;
    for (const rotation of [0, 0.7, -Math.PI / 4]) {
      ribbon.rotation.z = rotation; // ce que fait le moteur
      ribbon.updateMatrixWorld(true);
      const box = new Box3().setFromObject(ribbon);
      // Largeur horizontale du ruban = épaisseur du trait (1 px), mesurée dans son orientation.
      const extent = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z);
      expect(extent).toBeCloseTo(1, 5);
    }
  });

  it('formes courbes : pas d’arête verticale (contours du haut et du bas seulement)', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    const ellipse = element(isoScene(simple).root, 'e1');
    expect(ellipse.getObjectByName('stroke-bottom')).toBeDefined();
    expect(ellipse.getObjectByName('stroke-vertical')).toBeUndefined();
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
