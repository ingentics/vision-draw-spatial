import { describe, expect, it } from 'vitest';
import { placeUnder } from '../../../../src/engine/core/edit/dragPlaces';

describe('place visée au glisser (sujet 481)', () => {
  const a = { x: 0, y: 0, width: 100, height: 100 };
  const b = { x: 100, y: 0, width: 100, height: 100 };

  it('celle qui contient le centre de la forme ; aucune sinon', () => {
    expect(placeUnder([a, b], { x: 60, y: 10, width: 100, height: 100 })).toBe(b);
    expect(placeUnder([a, b], { x: 0, y: 300, width: 100, height: 100 })).toBeUndefined();
  });

  it('places qui se recouvrent : la plus proche du centre', () => {
    const c = { x: 40, y: 0, width: 100, height: 100 };
    expect(placeUnder([a, c], { x: 30, y: 0, width: 100, height: 100 })).toBe(c);
  });
});
