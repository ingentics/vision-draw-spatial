import { Box3, Object3D } from 'three';
import type { BufferGeometry, MeshBasicMaterial, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { pickElement } from '../../../src/engine/interaction/pick';
import { blockHeight } from '../../../src/engine/render/iso/block';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
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

  /** Segments d'une arête (lignes d'épaisseur constante à l'écran) : [[x0, y0, z0, x1, y1, z1], …] en espace page. */
  const segments = (object: Object3D) => {
    const start = (object as Mesh).geometry.getAttribute('instanceStart');
    const end = (object as Mesh).geometry.getAttribute('instanceEnd');
    return Array.from({ length: start.count }, (_, i) => [
      start.getX(i),
      start.getY(i),
      start.getZ(i),
      end.getX(i),
      end.getY(i),
      end.getZ(i),
    ]);
  };

  it('arêtes du bloc : elles écrivent la profondeur (un label dessiné après, derrière le bloc, est masqué)', () => {
    const b = element(isoScene().root, B);
    for (const name of ['stroke', 'stroke-bottom', 'stroke-vertical']) {
      expect(((b.getObjectByName(name) as Mesh).material as MeshBasicMaterial).depthWrite, name).toBe(true);
    }
  });

  it('toutes les arêtes du bloc ont la couleur et le style de la bordure 2D, épaisseur comprise', () => {
    const b = element(isoScene().root, B);
    for (const name of ['stroke', 'stroke-bottom', 'stroke-vertical']) {
      const material = (b.getObjectByName(name) as Mesh).material as MeshBasicMaterial & {
        linewidth: number;
        worldUnits: boolean;
      };
      expect(material.color.getHexString(), name).toBe('b85450');
      // Même épaisseur (celle de la bordure) pour toutes, mesurée face à la caméra quelle que soit
      // l'orientation de l'arête : couchée ou debout, elle paraît aussi épaisse.
      expect(material.linewidth, name).toBe(1);
      expect(material.worldUnits, name).toBe(true);
    }
    // 4 angles vifs → 4 arêtes verticales, du sol au contour du dessus.
    const vertical = segments(b.getObjectByName('stroke-vertical')!);
    expect(vertical).toHaveLength(4);
    for (const [, , z0, , , z1] of vertical) {
      // Du contour du bas (posé 0,05 px au-dessus du sol) au contour du dessus.
      expect(z0).toBeCloseTo(0.05, 3);
      expect(z1).toBeCloseTo(20.05, 3);
    }
  });

  it('contour du dessus centré sur le bord (formes accolées : une seule ligne), arêtes du bas et verticales à l’extérieur', () => {
    const b = element(isoScene().root, B);
    // B : emprise x 440–560, y 200–280, bordure de 1 px. Le dessus suit le bord, comme en 2D : une
    // forme accolée trace sa bordure au même endroit au lieu d'une seconde bande à côté.
    const top = segments(b.getObjectByName('stroke')!);
    const xs = top.flatMap(([x0, , , x1]) => [x0!, x1!]);
    expect(Math.min(...xs)).toBe(440);
    expect(Math.max(...xs)).toBe(560);
    // Le bas et les verticales passent à une demi-épaisseur de l'angle (sur la bissectrice) : ils
    // touchent les faces sans être mangés par elles ; chaque verticale part d'un sommet du bas.
    const bottom = segments(b.getObjectByName('stroke-bottom')!);
    const bx = bottom.flatMap(([x0, , , x1]) => [x0!, x1!]);
    expect(Math.min(...bx)).toBeLessThan(440);
    expect(Math.min(...bx)).toBeGreaterThan(439.5);
    const key = (x: number, y: number) => `${x.toFixed(4)},${y.toFixed(4)}`;
    const bottomCorners = new Set(bottom.map(([x, y]) => key(x!, y!)));
    for (const [x0, y0, , x1, y1] of segments(b.getObjectByName('stroke-vertical')!)) {
      expect(bottomCorners.has(key(x0!, y0!))).toBe(true);
      // Le haut de la verticale reste dans l'épaisseur du contour du dessus (à moins d'une épaisseur de l'angle).
      const corner = top.find(([x, y]) => Math.hypot(x! - x1!, y! - y1!) < 1);
      expect(corner).toBeDefined();
    }
  });

  it('formes accolées : la ligne commune est celle de la forme dessinée en dernier (biais de profondeur)', () => {
    const root = isoScene().root;
    const offset = (id: string) => {
      const material = (element(root, id).getObjectByName('stroke') as Mesh).material as MeshBasicMaterial;
      expect(material.polygonOffset).toBe(true);
      return material.polygonOffsetUnits;
    };
    // A est dessinée avant B : B passe devant à profondeur égale.
    expect(offset(B)).toBeLessThan(offset(A));
  });

  it('arêtes pointillées comme la bordure 2D (A est en pointillés)', () => {
    const a = element(isoScene().root, A);
    for (const name of ['stroke', 'stroke-vertical']) {
      expect(((a.getObjectByName(name) as Mesh).material as MeshBasicMaterial & { dashed: boolean }).dashed).toBe(true);
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
