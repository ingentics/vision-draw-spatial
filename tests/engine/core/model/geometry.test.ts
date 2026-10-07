import { describe, expect, it } from 'vitest';
import {
  boundsOfPoints,
  inflate,
  rectDistance,
  ceilToGrid,
  center,
  distance,
  insidePolygon,
  rectContains,
  rectsOverlap,
  segmentDistance,
  segmentIntersection,
  segmentsCross,
  prunePath,
  simplifyPath,
  unionOf,
} from '../../../../src/engine/core/model/geometry';

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

  it('chevauchement de deux rectangles, bords exclus (sujet 276)', () => {
    const r = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsOverlap(r, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(r, { x: 2, y: 2, width: 2, height: 2 })).toBe(true);
    expect(rectsOverlap(r, { x: 10, y: 0, width: 5, height: 5 })).toBe(false);
    expect(rectsOverlap(r, { x: 0, y: 11, width: 5, height: 5 })).toBe(false);
  });

  it('longueur arrondie au pas de grille supérieur (sujet 263)', () => {
    expect(ceilToGrid(121, 10)).toBe(130);
    expect(ceilToGrid(120, 10)).toBe(120);
    expect(ceilToGrid(130.0000001, 10)).toBe(130);
    expect(ceilToGrid(96, 20)).toBe(100);
    expect(ceilToGrid(121.5, 0)).toBe(121.5);
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

  it('simplification d’un tracé calculé : un demi-tour est retiré comme un point aligné', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 10, y: 10 },
    ];
    expect(simplifyPath(path)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(prunePath(path, 1e-6, true)).toEqual(path);
  });
});

describe('rectangle agrandi, distance à un rectangle (sujet 307)', () => {
  const r = { x: 0, y: 0, width: 10, height: 20 };

  it('agrandi de chaque côté, rétréci avec une marge négative', () => {
    expect(inflate(r, 5)).toEqual({ x: -5, y: -5, width: 20, height: 30 });
    expect(inflate(r, -2)).toEqual({ x: 2, y: 2, width: 6, height: 16 });
  });

  it('distance : 0 dedans et sur le bord, au plus proche bord ou coin dehors', () => {
    expect(rectDistance(r, { x: 5, y: 5 })).toBe(0);
    expect(rectDistance(r, { x: 10, y: 20 })).toBe(0);
    expect(rectDistance(r, { x: 15, y: 10 })).toBe(5);
    expect(rectDistance(r, { x: 13, y: 24 })).toBe(5);
  });
});
