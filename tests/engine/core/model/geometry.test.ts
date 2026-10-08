import { describe, expect, it } from 'vitest';
import {
  boundsOfPoints,
  inflate,
  rectDistance,
  ceilToGrid,
  center,
  direction,
  distance,
  fitScale,
  insidePolygon,
  rectContains,
  rectsOverlap,
  samePoint,
  samePoints,
  sameRect,
  segmentDistance,
  segmentProjection,
  segmentIntersection,
  segmentsCross,
  prunePath,
  rectExitPoint,
  simplifyPath,
  snapPoint,
  snapToGrid,
  unionOf,
  unit,
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

describe('sortie d’un rectangle vers un point (sujet 366)', () => {
  const r = { x: 0, y: 0, width: 40, height: 20 };
  it('franchit le bord du côté du point, centre si le point est au centre', () => {
    expect(rectExitPoint(r, { x: 100, y: 10 })).toEqual({ x: 40, y: 10 });
    expect(rectExitPoint(r, { x: 20, y: -50 })).toEqual({ x: 20, y: 0 });
    expect(rectExitPoint(r, { x: 40, y: 20 })).toEqual({ x: 40, y: 20 });
    expect(rectExitPoint(r, { x: 20, y: 10 })).toEqual({ x: 20, y: 10 });
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

describe('briques géométriques du tronc (sujet 382)', () => {
  it('aimantation à la grille ; sans grille, arrondi au pixel', () => {
    expect(snapToGrid(14, 10)).toBe(10);
    expect(snapToGrid(15, 10)).toBe(20);
    expect(snapToGrid(-14, 10)).toBe(-10);
    expect(snapToGrid(14.6, 0)).toBe(15);
    expect(snapToGrid(14.4, -5)).toBe(14);
    expect(snapPoint({ x: 26, y: 34 }, 20)).toEqual({ x: 20, y: 40 });
  });

  it('projection sur un segment : paramètre borné à [0, 1], début d’un segment nul', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    expect(segmentProjection({ x: 4, y: 3 }, a, b)).toEqual({ t: 0.4, point: { x: 4, y: 0 } });
    expect(segmentProjection({ x: -5, y: 2 }, a, b)).toEqual({ t: 0, point: a });
    expect(segmentProjection({ x: 15, y: 2 }, a, b)).toEqual({ t: 1, point: b });
    expect(segmentProjection({ x: 3, y: 3 }, a, a)).toEqual({ t: 0, point: a });
  });

  it('échelle qui fait tenir : le côté le plus serré décide, repli pour un contenu sans étendue', () => {
    expect(fitScale({ width: 100, height: 50 }, { width: 200, height: 200 }, 1)).toBe(2);
    expect(fitScale({ width: 100, height: 50 }, { width: 200, height: 50 }, 1)).toBe(1);
    expect(fitScale({ width: 100, height: 0 }, { width: 50, height: 10 }, 1)).toBe(0.5);
    expect(fitScale({ width: 0, height: 0 }, { width: 50, height: 10 }, 3)).toBe(3);
  });

  it('vecteurs unitaires : nul pour un vecteur nul ou des points confondus', () => {
    expect(unit({ x: 3, y: -4 })).toEqual({ x: 0.6, y: -0.8 });
    expect(unit({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(direction({ x: 1, y: 1 }, { x: 1, y: 6 })).toEqual({ x: 0, y: 1 });
    expect(direction({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it('égalités exactes de points et de rectangles', () => {
    expect(samePoint({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePoint({ x: 1, y: 2 }, { x: 1, y: 2.0001 })).toBe(false);
    expect(samePoints([{ x: 1, y: 2 }], [{ x: 1, y: 2 }])).toBe(true);
    expect(samePoints([{ x: 1, y: 2 }], [])).toBe(false);
    expect(
      samePoints(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        [
          { x: 1, y: 1 },
          { x: 0, y: 0 },
        ],
      ),
    ).toBe(false);
    const r = { x: 0, y: 0, width: 10, height: 5 };
    expect(sameRect(r, { ...r })).toBe(true);
    expect(sameRect(r, { ...r, height: 6 })).toBe(false);
  });
});
