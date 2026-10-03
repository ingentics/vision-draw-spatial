import { Box3, Object3D } from 'three';
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
    volume: { depth: 40 },
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

  describe('iso / 3D : bâtiments (toit plat rectangulaire avec le label, façade du type)', () => {
    const ctx: RenderContext = { text: { create: () => new Object3D() }, volume: { depth: 40 } };
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;

    it('hauteur : la même épaisseur par défaut que toutes les formes, spatial.height prioritaire', () => {
      const rectangle = { ...shape('db'), kind: 'rectangle', style: {} };
      expect(registry.volumeHeight(rectangle, ctx)).toBe(40);
      for (const id of ['db', 'queue', 'cache', 'flow']) expect(registry.volumeHeight(shape(id), ctx), id).toBe(40);
      const low = { ...shape('queue'), style: { ...shape('queue').style, 'spatial.height': '12' } };
      expect(registry.volumeHeight(low, ctx)).toBe(12);
    });

    it('toit commun : rectangle de l’emprise, en haut, avec le label', () => {
      const { element, texts } = build('iso');
      for (const [id, label] of [
        ['db', 'Commandes'],
        ['queue', 'Événements'],
        ['cache', 'Sessions'],
      ] as const) {
        const roof = element(id).getObjectByName('roof')!;
        const [min, max] = box(roof.getObjectByName('top')!);
        const { x, y, width, height } = shape(id).bounds;
        expect([min, max], id).toEqual([
          [x, 40, y],
          [x + width, 40, y + height],
        ]);
        expect(
          texts.filter((t) => t.text === label),
          id,
        ).toHaveLength(1);
      }
    });

    it('BDD : bloc droit, arcs gravés (rainure + arête) sur les quatre faces', () => {
      const { element } = build('iso');
      const db = element('db');
      // Bloc plein : l'emprise de la forme (40–100 × 40–120), sans retrait.
      const [min, max] = box(db.getObjectByName('roof')!.getObjectByName('sides')!);
      expect([min![0], max![0], min![2], max![2]]).toEqual([40, 100, 40, 120]);
      // 3 arcs par face (hauteur 40), chacun gravé : une rainure et son arête.
      expect(named(db, 'facade-groove')).toHaveLength(4 * 3);
      expect(named(db, 'facade')).toHaveLength(4 * 3);
    });

    it('cache : une tranche par nœud (spatial.nodes = 4), rainures en retrait, voyants sur les faces', () => {
      const { element } = build('iso');
      const cache = element('cache');
      expect(cache.children.filter((c) => c.name.startsWith('node:') || c.name === 'roof')).toHaveLength(4);
      expect(named(cache, 'led').length).toBeGreaterThanOrEqual(4 * 4);
      expect(box(cache)[1]![1]).toBeCloseTo(40, 0);
    });

    it('queue : chevrons de flux sur les deux faces longues, cercle sur chaque bout', () => {
      const { element } = build('iso');
      const engravings = named(element('queue'), 'facade');
      // Bouts (faces ouest / est) : x constant ; faces longues (nord / sud) : y constant.
      const flat = (c: Object3D, axis: 0 | 2) => box(c)[1]![axis]! - box(c)[0]![axis]! < 0.5;
      const chevrons = engravings.filter((c) => flat(c, 2));
      const circles = engravings.filter((c) => flat(c, 0));
      expect(chevrons.length).toBeGreaterThanOrEqual(2);
      expect(chevrons.length % 2).toBe(0);
      // Face nord (y = 50) : la moitié des chevrons.
      const north = chevrons.filter((c) => box(c)[0]![2]! < 50);
      expect(north.length).toBe(chevrons.length / 2);
      // Un cercle par bout, au niveau des chevrons, centré sur la face.
      expect(circles).toHaveLength(2);
      const [chevronMin, chevronMax] = box(chevrons[0]!).map((v) => v[1]!);
      for (const circle of circles) {
        const [min, max] = box(circle);
        expect((min![1]! + max![1]!) / 2).toBeCloseTo((chevronMin! + chevronMax!) / 2, 0);
      }
      // Creusés : une rainure sombre sous chaque gravure.
      expect(named(element('queue'), 'facade-groove')).toHaveLength(engravings.length);
    });

    it('étiquettes de façade : DB, QUEUE, CACHE sur les quatre faces, en bas', () => {
      const { element, texts } = build('iso');
      for (const id of ['db', 'queue', 'flow', 'cache']) {
        expect(named(element(id), 'facade-tag'), id).toHaveLength(4);
      }
      // Deux queues dans la page (« Événements » et « Flux ») : 8 étiquettes QUEUE.
      expect(texts.filter((t) => t.text === 'DB')).toHaveLength(4);
      expect(texts.filter((t) => t.text === 'QUEUE')).toHaveLength(8);
      expect(texts.filter((t) => t.text === 'CACHE')).toHaveLength(4);
      // Ancrées en bas à droite de la face, dans leur repère.
      expect(texts.find((t) => t.text === 'DB')).toMatchObject({ anchorX: 'right', anchorY: 'bottom-baseline' });
    });

    it('étiquettes : spatial.tag les remplace, vide = aucune ; désactivables par le réglage', () => {
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
      const db = page.shapes.find((s) => s.id === 'db')!;
      const render = (shape: typeof db, context = ctx) => registry.sceneRenderer(shape, 'iso').create(shape, context);
      render({ ...db, style: { ...db.style, 'spatial.tag': 'PostgreSQL' } });
      expect(texts.filter((t) => t.text === 'PostgreSQL')).toHaveLength(4);
      expect(named(render({ ...db, style: { ...db.style, 'spatial.tag': '' } }), 'facade-tag')).toHaveLength(0);
      expect(named(render(db, { ...ctx, volume: { depth: 20, tags: false } }), 'facade-tag')).toHaveLength(0);
    });

    it('sans fond : reste à plat (pas de volume fantôme)', () => {
      const { element } = build('iso');
      expect(element('hollow').getObjectByName('sides')).toBeUndefined();
      // Le dessin 2D du cylindre (avec sa lèvre), pas l'emprise elliptique.
      expect(named(element('hollow'), 'stroke-lip')).toHaveLength(1);
    });
  });
});
