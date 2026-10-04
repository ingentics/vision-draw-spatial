import { describe, expect, it } from 'vitest';
import { dropBounds, PALETTE_CATEGORIES, SHAPE_TEMPLATES, searchTemplates } from '../../../src/engine/edit/palette';
import { resolveShapeKind, parseStyle } from '../../../src/engine/format/style';
import { createDefaultRegistry } from '../../../src/engine/render/shapes/registry';

describe('palette', () => {
  it('ne propose que des formes dessinées par le moteur', () => {
    const kinds = new Set(SHAPE_TEMPLATES.map((t) => resolveShapeKind(parseStyle(t.style))));
    expect([...kinds].sort()).toEqual(['cylinder3', 'datastore', 'ellipse', 'rectangle', 'rhombus', 'text']);
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

  it('catégories : Général puis Architecture, chaque forme dans une catégorie connue', () => {
    expect(PALETTE_CATEGORIES.map((c) => c.name)).toEqual(['Général', 'Architecture']);
    const byCategory = (id: string) => SHAPE_TEMPLATES.filter((t) => t.category === id).map((t) => t.id);
    expect(byCategory('general')).toEqual(['rectangle', 'rounded', 'ellipse', 'circle', 'rhombus', 'text']);
    expect(byCategory('architecture')).toEqual(['database', 'queue', 'cache']);
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
    });

    it('sur les mots-clés et le nom de la catégorie', () => {
      expect(ids('bdd')).toEqual(['database']);
      expect(ids('cyl')).toEqual(['database', 'queue']);
      expect(ids('architecture')).toEqual(['database', 'queue', 'cache']);
    });

    it('plusieurs mots : chacun doit apparaître', () => {
      expect(ids('rect arrondi')).toEqual(['rounded']);
    });

    it('aucun résultat', () => {
      expect(ids('zzz')).toEqual([]);
    });
  });
});
