import { describe, expect, it } from 'vitest';
import { defaultModeRegistry } from '../../../src/engine/modes/registry';
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

/** Nom de forme d'un style, comme à la lecture : `spatial.kind`, sinon deviné du style draw.io. */
function kindOf(style: string): string {
  const parsed = parseStyle(style);
  return parsed.values['spatial.kind'] ?? resolveShapeKind(parsed);
}

describe('palette', () => {
  it('ne propose que des formes dessinées par le moteur', () => {
    const kinds = new Set(SHAPE_TEMPLATES.map((t) => kindOf(t.style)));
    expect([...kinds].sort()).toEqual([
      'background-task',
      'cylinder3',
      'datastore',
      'ellipse',
      'event-consumer',
      'hexagon',
      'labeled-process',
      'mxgraph.basic.4_point_star_2',
      'mxgraph.basic.6_point_star',
      'mxgraph.basic.octagon2',
      'mxgraph.basic.pentagon',
      'parallelogram',
      'process',
      'rdd-document',
      'rdd-embedded',
      'rdd-entity',
      'rdd-enum',
      'rdd-view',
      'rectangle',
      'recurring-task',
      'rhombus',
      'stencil:actor-droid',
      'stencil:plug',
      'step',
      'text',
      'triangle',
      'umlActor',
    ]);
  });

  it('toutes les formes de la palette sont dessinées par le moteur (pas de placeholder)', () => {
    const registry = createDefaultRegistry();
    for (const template of SHAPE_TEMPLATES) {
      const style = parseStyle(template.style);
      const shape = { kind: kindOf(template.style), style: style.values } as Parameters<typeof registry.resolve>[0];
      expect(registry.resolve(shape).supported, template.id).toBe(true);
      expect(registry.resolve(shape).definition.id, template.id).toBe(template.id);
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
      'parallelogram',
      'step',
      'four-point-star',
      'six-point-star',
    ]);
    expect(byCategory('general')).toEqual(['text', 'title', 'actor', 'actor-droid']);
    const known = new Set(
      [...PALETTE_CATEGORIES, ...defaultModeRegistry.list().flatMap((mode) => mode.paletteCategories ?? [])].map(
        (c) => c.id,
      ),
    );
    for (const template of SHAPE_TEMPLATES) expect(known.has(template.category), template.id).toBe(true);
    expect(byCategory('architecture')).toEqual([
      'database',
      'queue',
      'distributed-cache',
      'plug',
      'process',
      'event-consumer',
      'background-task',
      'recurring-task',
      'labeled-process',
    ]);
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
      expect(ids('architecture')).toEqual([
        'database',
        'queue',
        'distributed-cache',
        'plug',
        'process',
        'event-consumer',
        'background-task',
        'recurring-task',
        'labeled-process',
      ]);
      expect(ids('plugin')).toEqual(['plug']);
      expect(ids('tranche')).toEqual(['labeled-process']);
      expect(ids('cron')).toEqual(['recurring-task']);
      expect(ids('heading')).toEqual(['title']);
      expect(ids('worker')).toEqual(['background-task']);
      expect(ids('subscriber')).toEqual(['event-consumer']);
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
    return { kind: kindOf(style), style: parsed.values } as unknown as ShapeModel;
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
    expect(templateOfShape(shape('text;html=1;fontSize=64;fontColor=#dedede;'))?.id).toBe('title');
    expect(templateOfShape(shape('text;html=1;fontSize=64;fontColor=#FF0000;'))?.id).toBe('text');
  });

  it('liste chaque type une fois, dans l’ordre de la palette', () => {
    const shapes = ['shape=cylinder3;', 'rounded=0;', 'shape=cylinder3;size=8;', 'shape=unknown;'].map(shape);
    expect(usedTemplates({ shapes: shapes as never }).map((t) => t.id)).toEqual(['rectangle', 'database']);
    expect(usedTemplates({ shapes: [] })).toEqual([]);
    expect(usedTemplates(undefined)).toEqual([]);
  });
});
