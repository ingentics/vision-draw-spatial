import { describe, expect, it } from 'vitest';
import {
  boundsOfPoints,
  center,
  distance,
  insidePolygon,
  rectContains,
  segmentDistance,
  segmentIntersection,
  segmentsCross,
  simplifyPath,
  unionOf,
} from '../../../src/engine/model/geometry';

describe('géométrie partagée (sujet 205)', () => {
  it('points et rectangles', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(center({ x: 10, y: 20, width: 40, height: 10 })).toEqual({ x: 30, y: 25 });
    const r = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectContains(r, { x: 10, y: 5 })).toBe(true);
    expect(rectContains(r, { x: 10.1, y: 5 })).toBe(false);
    expect(boundsOfPoints([])).toBeUndefined();
    expect(unionOf([])).toBeUndefined();
    expect(unionOf([r, { x: 20, y: -5, width: 5, height: 5 }])).toEqual({ x: 0, y: -5, width: 25, height: 15 });
  });

  it('segments', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 10 };
    expect(segmentsCross(a, b, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(true);
    // Un bout posé sur l'autre segment ne croise pas.
    expect(segmentsCross(a, b, { x: 5, y: 5 }, { x: 10, y: 0 })).toBe(false);
    expect(segmentIntersection(a, b, { x: 0, y: 10 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 5 });
    expect(segmentIntersection(a, b, { x: 0, y: 1 }, { x: 10, y: 11 })).toBeUndefined();
    expect(segmentDistance({ x: 0, y: 5 }, { x: -10, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(segmentDistance({ x: 13, y: 4 }, { x: -10, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it('polygone, bord compris', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(insidePolygon(square, { x: 5, y: 5 })).toBe(true);
    expect(insidePolygon(square, { x: 10, y: 5 })).toBe(true);
    expect(insidePolygon(square, { x: 11, y: 5 })).toBe(false);
  });

  it('simplification d’un tracé : points confondus et alignés retirés, coudes gardés', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 15, y: 15 },
      { x: 20, y: 20 },
    ];
    expect(simplifyPath(path)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
  });
});
