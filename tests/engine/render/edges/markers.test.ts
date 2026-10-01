import { describe, expect, it } from 'vitest';
import { buildMarker } from '../../../../src/engine/render/edges/markers';
import { labelPoint, roundCorners, shorten } from '../../../../src/engine/render/edges/polyline';

const tip = { x: 100, y: 0 };
const right = { x: 1, y: 0 };

describe('buildMarker', () => {
  it('classic : pointe sur l’extrémité, encoche à 3/4, ligne raccourcie jusqu’à l’encoche', () => {
    const m = buildMarker('classic', tip, right, 6, 1, true)!;
    expect(m.fill).toEqual([
      { x: 100, y: 0 },
      { x: 93, y: 3.5 },
      { x: 94.75, y: 0 },
      { x: 93, y: -3.5 },
    ]);
    expect(m.inset).toBeCloseTo(5.25);
  });

  it('block creux (endFill=0) : contour fermé', () => {
    const m = buildMarker('block', tip, right, 6, 1, false)!;
    expect(m.fill).toBeUndefined();
    expect(m.outline).toMatchObject({ closed: true });
  });

  it('open : contour ouvert, ligne jusqu’à la pointe', () => {
    const m = buildMarker('open', tip, right, 6, 1, true)!;
    expect(m.outline?.closed).toBe(false);
    expect(m.inset).toBe(0.5);
  });

  it('none : rien ; inconnu : flèche classique', () => {
    expect(buildMarker('none', tip, right, 6, 1, true)).toBeUndefined();
    expect(buildMarker('ERmandOne', tip, right, 6, 1, true)?.fill).toHaveLength(4);
  });
});

describe('polyligne', () => {
  const route = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('shorten raccourcit les extrémités dans l’axe du segment', () => {
    expect(shorten(route, 10, 5)).toEqual([
      { x: 10, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 95 },
    ]);
  });

  it('labelPoint : milieu par défaut, position et distance perpendiculaire', () => {
    expect(labelPoint(route, { position: 0, distance: 0, offset: { x: 0, y: 0 } })).toEqual({ x: 100, y: 0 });
    expect(labelPoint(route, { position: -0.5, distance: 0, offset: { x: 3, y: 4 } })).toEqual({ x: 53, y: 4 });
    expect(labelPoint(route, { position: -0.5, distance: -10, offset: { x: 0, y: 0 } })).toEqual({ x: 50, y: 10 });
  });

  it('roundCorners garde les extrémités et adoucit l’angle', () => {
    const rounded = roundCorners(route, 10);
    expect(rounded[0]).toEqual(route[0]);
    expect(rounded[rounded.length - 1]).toEqual(route[2]);
    expect(rounded).not.toContainEqual({ x: 100, y: 0 });
  });
});
