import { describe, expect, it } from 'vitest';
import { edgeEnds, shapesById } from '../../../../src/engine/core/model/pageIndex';

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
