import { describe, expect, it } from 'vitest';
import { readonlyModel } from '../../../../src/engine/core/model/freeze';
import { livePageOpened, livePageSettled, pageMemo } from '../../../../src/engine/core/model/pageMemo';
import type { PageModel } from '../../../../src/engine/core/model/types';

describe('calcul gardé par page (sujet 552)', () => {
  it('gardé pour une page du document ; sur la copie d’un geste, refait quand une forme change ; gardé une fois rendue', () => {
    let runs = 0;
    const count = pageMemo((page) => {
      runs++;
      return page.shapes.length;
    });
    const page = { id: 'p', shapes: [], edges: [] } as unknown as PageModel;
    count(page);
    count(page);
    expect(runs).toBe(1);
    const shape = { id: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } };
    const copy = { id: 'p', shapes: [shape], edges: [] } as unknown as PageModel;
    livePageOpened(copy);
    count(copy);
    count(copy);
    expect(runs).toBe(2);
    // Le geste remplace les bornes : refait. La vue en lecture seule que reçoit un plugin est aussi reconnue.
    shape.bounds = { ...shape.bounds, x: 5 };
    count(readonlyModel(copy));
    (copy.shapes as unknown[]).push({ id: 'b', bounds: shape.bounds });
    expect(count(copy)).toBe(2);
    expect(runs).toBe(4);
    livePageSettled(copy);
    count(copy);
    count(copy);
    expect(runs).toBe(5);
  });
});
