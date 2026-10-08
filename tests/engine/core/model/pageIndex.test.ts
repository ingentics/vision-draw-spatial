import { describe, expect, it } from 'vitest';
import {
  byId,
  edgeEnds,
  edgeOf,
  edgesById,
  elementOf,
  shapeOf,
  shapesById,
} from '../../../../src/engine/core/model/pageIndex';

describe('index d’une page (sujet 325)', () => {
  const page = { shapes: [{ id: 'a' }, { id: 'b' }] };

  it('formes par id', () => {
    const shapes = shapesById(page);
    expect([...shapes.keys()]).toEqual(['a', 'b']);
    expect(shapes.get('b')).toBe(page.shapes[1]);
  });

  it('bouts d’une flèche : un bout libre ou inconnu est absent', () => {
    const shapes = shapesById(page);
    expect(edgeEnds(shapes, { sourceId: 'a', targetId: 'b' })).toEqual({
      source: page.shapes[0],
      target: page.shapes[1],
    });
    expect(edgeEnds(shapes, { sourceId: 'a' })).toEqual({ source: page.shapes[0] });
    expect(edgeEnds(shapes, { sourceId: 'x', targetId: 'b' })).toEqual({ target: page.shapes[1] });
    expect(edgeEnds(shapes, {})).toEqual({});
  });
});

describe('accès par id (sujet 382)', () => {
  const page = { shapes: [{ id: 'a' }, { id: 'b' }], edges: [{ id: 'e' }, { id: 'f' }] };

  it('élément d’une liste par id ; rien sans liste, sans id ou s’il manque', () => {
    expect(byId(page.shapes, 'b')).toBe(page.shapes[1]);
    expect(byId(page.shapes, 'x')).toBeUndefined();
    expect(byId(page.shapes, undefined)).toBeUndefined();
    expect(byId(undefined, 'a')).toBeUndefined();
  });

  it('forme et flèche par id : chacune dans sa liste, rien sans page', () => {
    expect(shapeOf(page, 'a')).toBe(page.shapes[0]);
    expect(shapeOf(page, 'e')).toBeUndefined();
    expect(shapeOf(undefined, 'a')).toBeUndefined();
    expect(edgeOf(page, 'f')).toBe(page.edges[1]);
    expect(edgeOf(page, 'a')).toBeUndefined();
    expect(edgeOf(page, undefined)).toBeUndefined();
  });

  it('forme ou flèche par id', () => {
    expect(elementOf(page, 'b')).toBe(page.shapes[1]);
    expect(elementOf(page, 'e')).toBe(page.edges[0]);
    expect(elementOf(page, 'x')).toBeUndefined();
    expect(elementOf(undefined, 'a')).toBeUndefined();
  });

  it('flèches par id', () => {
    const edges = edgesById(page);
    expect([...edges.keys()]).toEqual(['e', 'f']);
    expect(edges.get('f')).toBe(page.edges[1]);
  });
});
