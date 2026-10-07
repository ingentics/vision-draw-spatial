import { describe, expect, it } from 'vitest';
import { curveThrough } from '../../../../../src/engine/core/render/edges/polyline';

describe('tracé courbe (curved=1)', () => {
  const route = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];

  it('part du premier point, arrive au dernier, passe par le milieu des segments intermédiaires', () => {
    const curve = curveThrough(route);
    expect(curve[0]).toEqual({ x: 0, y: 0 });
    expect(curve[curve.length - 1]).toEqual({ x: 200, y: 100 });
    expect(curve).toContainEqual({ x: 100, y: 50 });
  });

  it('sans coins vifs : jamais par un coude du tracé', () => {
    const curve = curveThrough(route);
    expect(curve).not.toContainEqual({ x: 100, y: 0 });
    expect(curve).not.toContainEqual({ x: 100, y: 100 });
  });

  it('deux points : segment droit, inchangé', () => {
    const straight = route.slice(0, 2);
    expect(curveThrough(straight)).toBe(straight);
  });
});
