import { Box3, Object3D } from 'three';
import type { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../src/engine/diagnostics/unsupportedStyles';
import { parseDrawio } from '../../../src/engine/format/parse';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/render/shapes/registry';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
import { fixture } from '../../helpers';

const document = parseDrawio(fixture('storage.drawio'));
const page = document.pages[0]!;
const registry = createDefaultRegistry();

function build(level: 'flat' | 'iso') {
  const texts: TextSpec[] = [];
  const ctx: RenderContext = {
    text: {
      create(spec) {
        texts.push(spec);
        return new Object3D();
      },
    },
    volume: { depth: 20 },
  };
  const scene = buildPageScene(page, registry, ctx, level);
  scene.root.updateMatrixWorld(true);
  const element = (id: string) => scene.root.children.find((c) => c.userData.elementId === id)!;
  return { scene, texts, element };
}

/** Emprise monde : x = x page, y = hauteur, z = y page. */
const box = (object: Object3D) => {
  const b = new Box3().setFromObject(object);
  return [b.min.toArray(), b.max.toArray()].map((v) => v.map((n) => +n.toFixed(2)));
};
const named = (root: Object3D, name: string) => {
  const found: Object3D[] = [];
  root.traverse((o) => {
    if (o.name === name) found.push(o);
  });
  return found;
};

describe('formes de stockage : BDD, queue, cache distribué', () => {
  it('reconnues par le moteur (plus de placeholder ni de diagnostic)', () => {
    for (const shape of page.shapes) expect(registry.resolve(shape).supported, shape.kind).toBe(true);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  describe('2D, comme draw.io', () => {
    it('BDD (cylinder3) : silhouette sur les bornes, une lèvre, label sous l’ellipse du haut (boundedLbl)', () => {
      const { element, texts } = build('flat');
      const db = element('db');
      expect(box(db.getObjectByName('fill')!)).toEqual([
        [40, 0, 40],
        [100, 0, 120],
      ]);
      expect(named(db, 'stroke-lip')).toHaveLength(1);
      // Zone du label (size = 8) : de y + 2 × size (56) à y + h − 0,3 × size (117,6) ; centre 86,8.
      expect(texts.find((t) => t.text === 'Commandes')!.y).toBeCloseTo(86.8);
    });

    it('cache (datastore) : trois anneaux ; queue (cylindre couché, direct_data) : le bord du bout droit', () => {
      const { element } = build('flat');
      expect(named(element('cache'), 'stroke-lip')).toHaveLength(3);
      expect(named(element('queue'), 'stroke-lip')).toHaveLength(1);
      expect(named(element('flow'), 'stroke-lip')).toHaveLength(1);
      // Couché vers la droite (direction=south) : la lèvre est au bout droit (x = 260), entre size et
      // 1,75 × size du bout (size = 8), à l'épaisseur du trait près.
      const [left, right] = box(named(element('queue'), 'stroke-lip')[0]!).map((v) => v[0]!);
      expect(left).toBeGreaterThanOrEqual(245);
      expect(right).toBeLessThanOrEqual(252.5);
      expect(box(element('queue').getObjectByName('fill')!)).toEqual([
        [160, 0, 50],
        [260, 0, 110],
      ]);
    });
  });

  describe('redimensionnement : le corps s’étire, les ellipses gardent leur taille', () => {
    /** Étendue de la première lèvre, en coordonnées page (objet hors scène) : axe 0 = x, axe 1 = y. */
    const lipWidth = (id: string, patch: Partial<{ width: number; height: number }>, axis: 0 | 1) => {
      const shape = page.shapes.find((s) => s.id === id)!;
      const resized = { ...shape, bounds: { ...shape.bounds, ...patch } };
      const object = registry
        .sceneRenderer(resized, 'flat')
        .create(resized, { text: { create: () => new Object3D() } });
      object.updateMatrixWorld(true);
      const [min, max] = box(named(object, 'stroke-lip')[0]!);
      return +(max![axis]! - min![axis]!).toFixed(2);
    };

    it('BDD : ellipse du haut identique, quelle que soit la hauteur', () => {
      expect(lipWidth('db', { height: 300 }, 1)).toBe(lipWidth('db', {}, 1));
      expect(lipWidth('db', {}, 1)).toBeGreaterThan(0);
    });

    it('queue : bout identique, quelle que soit la longueur', () => {
      expect(lipWidth('queue', { width: 400 }, 0)).toBe(lipWidth('queue', {}, 0));
    });

    it('BDD = cache avec une seule lèvre : même silhouette, même première lèvre, même avec size=15', () => {
      const ctx: RenderContext = { text: { create: () => new Object3D() } };
      const cache = page.shapes.find((s) => s.id === 'cache')!;
      const db = { ...cache, kind: 'cylinder3', style: { ...cache.style, shape: 'cylinder3', size: '15' } };
      const draw = (shape: typeof cache) => {
        const object = registry.sceneRenderer(shape, 'flat').create(shape, ctx);
        object.updateMatrixWorld(true);
        return object;
      };
      const [cacheObject, dbObject] = [draw(cache), draw(db)];
      expect(box(dbObject.getObjectByName('fill')!)).toEqual(box(cacheObject.getObjectByName('fill')!));
      expect(named(dbObject, 'stroke-lip')).toHaveLength(1);
      expect(box(named(dbObject, 'stroke-lip')[0]!)).toEqual(box(named(cacheObject, 'stroke-lip')[0]!));
    });

    it('queue = BDD couchée : son bout a la taille de l’ellipse de la BDD', () => {
      expect(lipWidth('queue', {}, 0)).toBe(lipWidth('db', {}, 1));
    });

    it('cache : anneaux identiques, quelle que soit la hauteur (taille fixe, contrairement à draw.io)', () => {
      expect(lipWidth('cache', { height: 300 }, 1)).toBe(lipWidth('cache', {}, 1));
      expect(lipWidth('cache', {}, 1)).toBeGreaterThan(0);
    });
  });

  describe('iso / 3D, en volume', () => {
    it('BDD : cylindre debout sur l’ellipse inscrite, de 0 à l’épaisseur', () => {
      const { element } = build('iso');
      expect(box(element('db').getObjectByName('sides')!)).toEqual([
        [40, 0, 40],
        [100, 20, 120],
      ]);
    });

    it('cache : une pile de disques par nœud (spatial.nodes = 4), label sur celui du haut', () => {
      const { element, texts } = build('iso');
      const cache = element('cache');
      const nodes = cache.children.filter((c) => c.name.startsWith('node:'));
      expect(nodes).toHaveLength(4);
      // Épaisseur totale = 20 : le haut du dernier disque.
      expect(box(cache)[1]![1]).toBeCloseTo(20, 0);
      expect(cache.userData.height).toBe(20);
      expect(texts.filter((t) => t.text === 'Sessions')).toHaveLength(1);
    });

    it('queue : tube couché dans le sens de la largeur, deux extrémités pleines et bordées', () => {
      const { element } = build('iso');
      const queue = element('queue');
      expect(box(queue.getObjectByName('sides')!)).toEqual([
        [160, 0, 50],
        [260, 20, 110],
      ]);
      expect(named(queue, 'cap')).toHaveLength(2);
      expect(named(queue, 'stroke')).toHaveLength(2);
      expect((queue.getObjectByName('sides') as Mesh).material).toMatchObject({ depthWrite: true });
    });

    it('sans fond : reste à plat (pas de volume fantôme)', () => {
      const { element } = build('iso');
      expect(element('hollow').getObjectByName('sides')).toBeUndefined();
      // Le dessin 2D du cylindre (avec sa lèvre), pas l'emprise elliptique.
      expect(named(element('hollow'), 'stroke-lip')).toHaveLength(1);
    });
  });
});
