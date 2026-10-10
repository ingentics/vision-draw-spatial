import { Object3D } from 'three';
import type { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { buildPageScene } from '../../../../../src/engine/core/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../../src/engine/core/render/types';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import { createDefaultRegistry, MODE_SHAPE_DEFINITIONS, SHAPE_TEMPLATES } from '../../../../../src/engine/plugins';
import { definition as storming } from '../../../../../src/engine/plugins/modes/eventstorming';
import { STICKY_TYPES, stickyType } from '../../../../../src/engine/plugins/modes/eventstorming/kinds';
import { MEASURE } from '../../../../helpers';
import { setup, sticky, stormingXml } from './helpers';

const KINDS = [
  'eventstorming-event',
  'eventstorming-command',
  'eventstorming-constraint',
  'eventstorming-system',
  'eventstorming-policy',
  'eventstorming-query',
  'eventstorming-actor',
  'eventstorming-hotspot',
];

describe('mode Event storming (sujet 475)', () => {
  it('s’enregistre avec ses 8 post-it, préfixés par l’id du mode', () => {
    const shapes = MODE_SHAPE_DEFINITIONS.get('eventstorming')!;
    expect(shapes.map((shape) => shape.id).sort()).toEqual([...KINDS].sort());
    expect(() => new PageModeRegistry().register(storming, shapes)).not.toThrow();
    expect(storming).toMatchObject({ id: 'eventstorming', namespace: 'es', name: 'Event storming' });
  });

  it('page en 2D seulement ; palette : les 8 post-it, Texte et Titre', () => {
    expect(storming.page!.viewModes).toEqual(['top']);
    expect(storming.page!.palette!.shapes).toEqual([...KINDS, 'text', 'title']);
    expect(storming.page!.palette!.categories).toEqual([{ id: 'eventstorming', name: 'Event storming', order: 5 }]);
  });

  it('modèles de la palette : 160 × 160, couleur du type, sans contour, à ombre, texte qui remplit', () => {
    const fills = ['#ffb74d', '#64b5f6', '#cfd8dc', '#f48fb1', '#ce93d8', '#a5d6a7', '#fff59d', '#e57373'];
    KINDS.forEach((kind, index) => {
      const template = SHAPE_TEMPLATES.find((t) => t.id === kind)!;
      expect(template).toMatchObject({ category: 'eventstorming', order: index + 1, width: 160, height: 160 });
      expect(template.style).toContain(`fillColor=${fills[index]};strokeColor=none;shadow=1;`);
      expect(template.style).toContain('fitText=fill');
      expect(template.style).toContain(`spatial.kind=${kind};`);
    });
    // Exemples dans l'infobulle de la palette (sujet 479).
    expect(SHAPE_TEMPLATES.find((t) => t.id === 'eventstorming-query')!.description).toBe(
      'Ex. : Historique des commandes, Stock',
    );
  });

  it('type reconnu par spatial.kind, quelle que soit la couleur', () => {
    const { shape } = setup(stormingXml(sticky('a', 'policy', 0, 0) + sticky('b', 'command', 200, 0)));
    const registry = createDefaultRegistry();
    expect(stickyType(shape('a'))).toBe(STICKY_TYPES[4]);
    expect(stickyType(shape('a'))!.label).toBe('Policy');
    expect(stickyType(shape('b'))!.label).toBe('Command');
    expect(registry.resolve(shape('a')).supported).toBe(true);
  });
});

describe('mode Event storming : dessin d’un post-it (sujet 475)', () => {
  const texts: TextSpec[] = [];
  const ctx: RenderContext = { ...MEASURE, text: { create: (spec) => (texts.push(spec), new Object3D()) } };
  const registry = createDefaultRegistry();
  const draw = (cells: string, pageAttributes = '') => {
    texts.length = 0;
    const { page } = setup(stormingXml(cells, pageAttributes));
    return buildPageScene(page(), registry, ctx, 'flat');
  };

  it('papier du Post-it ; label du type en gras, 16, noir à 80 %, à 8 du haut ; texte qui remplit la zone dessous', () => {
    const scene = draw(sticky('a', 'event', 0, 0, 'Commande passée'));
    const object = scene.root.children.find((c) => c.userData.elementId === 'a')!;
    expect(object.getObjectByName('fill')).toBeDefined();
    expect(object.getObjectByName('shadow')).toBeDefined();
    expect(object.getObjectByName('stroke')).toBeUndefined();
    const [label, text] = texts;
    // Ligne du label de 8 à 8 + 19,2 (interligne 1,2), le texte centré dedans.
    expect(label).toMatchObject({ text: 'Domain Event', fontSize: 16, bold: true, opacity: 0.8 });
    expect(label!.y).toBeCloseTo(8 + 9.6);
    expect(label!.color.getHexString()).toBe('000000');
    // Zone du texte : sous la ligne du label (8 + 19,2) plus 4, marges de 8.
    expect(text!.text).toBe('Commande passée');
    expect(text!.fit).toMatchObject({ width: 144, fill: true });
    expect(text!.fit!.height).toBeCloseTo(160 - 31.2 - 8);
  });

  it('papier arrondi ; ombre dans la largeur du papier, qui ne dépasse que dessous (sujet 482)', () => {
    const scene = draw(sticky('a', 'event', 0, 0, 'x'));
    const object = scene.root.children.find((c) => c.userData.elementId === 'a')!;
    const fill = object.getObjectByName('fill') as Mesh;
    fill.geometry.computeBoundingBox();
    expect(fill.geometry.boundingBox!.min).toMatchObject({ x: 0, y: 0 });
    // Coin arrondi : le coin exact du carré n'est pas dans le papier.
    const corners = (fill.geometry.getAttribute('position').array as Float32Array).length;
    expect(corners).toBeGreaterThan(4 * 3);
    for (const layer of object.getObjectByName('shadow')!.children as Mesh[]) {
      layer.geometry.computeBoundingBox();
      const box = layer.geometry.boundingBox!;
      expect(box.min.x).toBeGreaterThanOrEqual(0);
      expect(box.max.x).toBeLessThanOrEqual(160);
      expect(box.min.y).toBeGreaterThanOrEqual(0);
    }
    expect(SHAPE_TEMPLATES.find((t) => t.id === 'eventstorming-event')!.style).toContain('rounded=1;');
  });

  it('label trop large : réduit jusqu’à 10, puis « … »', () => {
    draw(sticky('a', 'query', 0, 0, '', 100, 100) + sticky('b', 'query', 200, 0, '', 40, 100));
    expect(texts[0]!.fontSize).toBeLessThan(16);
    expect(texts[0]!.fontSize).toBeGreaterThanOrEqual(10);
    expect(texts[0]!.text).toBe('Query Model');
    expect(texts[1]).toMatchObject({ fontSize: 10 });
    expect(texts[1]!.text.endsWith('…')).toBe(true);
  });

  it('labels masqués : pas de label, le texte prend toute la forme', () => {
    draw(sticky('a', 'event', 0, 0, 'Commande passée', 160, 160, 'spatial.es.labels=0;'));
    expect(texts).toHaveLength(1);
    expect(texts[0]!.fit).toEqual({ width: 144, height: 144, fill: true });
  });
});

describe('mode Event storming : cibles de l’aimantation bord à bord (sujet 477)', () => {
  it('un post-it se colle aux autres post-it, pas à une autre forme ; une autre forme à rien', () => {
    const text = `<mxCell id="t" value="x" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="300" width="60" height="30" as="geometry" /></mxCell>`;
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'actor', 200, 0) + text));
    const targets = storming.gestures!.snapTargets!;
    expect(targets(page(), shape('a'))).toEqual([{ id: 'b', rect: { x: 200, y: 0, width: 160, height: 160 } }]);
    expect(targets(page(), shape('t'))).toEqual([]);
  });
});
