import { describe, expect, it } from 'vitest';
import {
  dropBounds,
  PALETTE_CATEGORIES,
  SHAPE_TEMPLATES,
  searchTemplates,
  templateOfShape,
  usedTemplates,
} from '../../../src/engine/edit/palette';
import { resolveShapeKind, parseStyle } from '../../../src/engine/format/style';
import type { ShapeModel } from '../../../src/engine/model/types';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';

describe('palette', () => {
  it('ne propose que des formes dessinées par le moteur', () => {
    const kinds = new Set(SHAPE_TEMPLATES.map((t) => resolveShapeKind(parseStyle(t.style))));
    expect([...kinds].sort()).toEqual([
      'cylinder3',
      'datastore',
      'ellipse',
      'hexagon',
      'mxgraph.basic.octagon2',
      'mxgraph.basic.pentagon',
      'rectangle',
      'rhombus',
      'stencil:plug',
      'text',
      'triangle',
    ]);
  });

  it('toutes les formes de la palette sont dessinées par le moteur (pas de placeholder)', () => {
    const registry = createDefaultRegistry();
    for (const template of SHAPE_TEMPLATES) {
      const style = parseStyle(template.style);
      const shape = { kind: resolveShapeKind(style), style: style.values } as Parameters<typeof registry.resolve>[0];
      expect(registry.resolve(shape).supported, template.id).toBe(true);
    }
  });

  it('dropBounds : centrée sur le point de dépôt, coin aimanté à la grille', () => {
    expect(dropBounds({ width: 120, height: 60 }, { x: 103, y: 47 }, 10)).toEqual({
      x: 40,
      y: 20,
      width: 120,
      height: 60,
    });
    expect(dropBounds({ width: 120, height: 60 }, { x: 103, y: 47 }, 0)).toEqual({
      x: 43,
      y: 17,
      width: 120,
      height: 60,
    });
  });

  it('catégories : Géométrie, Général puis Architecture, chaque forme dans une catégorie connue (étape 68)', () => {
    expect(PALETTE_CATEGORIES.map((c) => c.name)).toEqual(['Géométrie', 'Général', 'Architecture']);
    const byCategory = (id: string) => SHAPE_TEMPLATES.filter((t) => t.category === id).map((t) => t.id);
    expect(byCategory('geometry')).toEqual([
      'rectangle',
      'rounded-rectangle',
      'ellipse',
      'circle',
      'diamond',
      'hexagon',
      'octagon',
      'pentagon',
      'triangle',
      'triangle-up',
    ]);
    expect(byCategory('general')).toEqual(['text']);
    const known = new Set(PALETTE_CATEGORIES.map((c) => c.id));
    for (const template of SHAPE_TEMPLATES) expect(known.has(template.category), template.id).toBe(true);
    expect(byCategory('architecture')).toEqual(['database', 'queue', 'distributed-cache', 'plug']);
  });

  describe('searchTemplates', () => {
    const ids = (query: string) => searchTemplates(SHAPE_TEMPLATES, query).map((t) => t.id);

    it('requête vide : toutes les formes', () => {
      expect(ids('')).toEqual(SHAPE_TEMPLATES.map((t) => t.id));
      expect(ids('   ')).toEqual(SHAPE_TEMPLATES.map((t) => t.id));
    });

    it('sans distinction de casse ni d’accents', () => {
      expect(ids('ELLIPSE')).toEqual(['ellipse']);
      expect(ids('donnees')).toEqual(['database']);
      expect(ids('général')).toEqual(ids('GENERAL'));
      expect(ids('geometrie')).toEqual(ids('Géométrie'));
    });

    it('sur les mots-clés et le nom de la catégorie', () => {
      expect(ids('bdd')).toEqual(['database']);
      expect(ids('cyl')).toEqual(['database', 'queue']);
      expect(ids('architecture')).toEqual(['database', 'queue', 'distributed-cache', 'plug']);
      expect(ids('plugin')).toEqual(['plug']);
    });

    it('plusieurs mots : chacun doit apparaître', () => {
      expect(ids('rect arrondi')).toEqual(['rounded-rectangle']);
    });

    it('aucun résultat', () => {
      expect(ids('zzz')).toEqual([]);
    });
  });
});

describe('formes utilisées (étape 56)', () => {
  const shape = (style: string) => {
    const parsed = parseStyle(style);
    return { kind: resolveShapeKind(parsed), style: parsed.values } as unknown as ShapeModel;
  };

  it('reconnaît chaque modèle depuis son propre style', () => {
    for (const template of SHAPE_TEMPLATES) expect(templateOfShape(shape(template.style))?.id).toBe(template.id);
  });

  it('reconnaît les formes d’un fichier depuis les clés distinctives', () => {
    expect(templateOfShape(shape('whiteSpace=wrap;html=1;'))?.id).toBe('rectangle');
    expect(templateOfShape(shape('rounded=1;fillColor=#f00;'))?.id).toBe('rounded-rectangle');
    expect(templateOfShape(shape('ellipse;aspect=fixed;'))?.id).toBe('circle');
    expect(templateOfShape(shape('shape=cylinder3;direction=north;'))?.id).toBe('queue');
    expect(templateOfShape(shape('shape=cylinder3;'))?.id).toBe('database');
    expect(templateOfShape(shape('shape=mxgraph.aws4.lambda;'))).toBeUndefined();
  });

  it('liste chaque type une fois, dans l’ordre de la palette', () => {
    const shapes = ['shape=cylinder3;', 'rounded=0;', 'shape=cylinder3;size=8;', 'shape=unknown;'].map(shape);
    expect(usedTemplates({ shapes: shapes as never }).map((t) => t.id)).toEqual(['rectangle', 'database']);
    expect(usedTemplates({ shapes: [] })).toEqual([]);
    expect(usedTemplates(undefined)).toEqual([]);
  });
});
