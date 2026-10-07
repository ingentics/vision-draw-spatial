import { describe, expect, it } from 'vitest';
import { routeAround } from '../../../../../../src/engine/core/edit/anchoring/auto/routeAround';
import { DEFAULT_AVOID_OPTIONS } from '../../../../../../src/engine/core/edit/anchoring/routing';

describe('routeAround', () => {
  // Départ sur la droite d'une forme en (0, 0, 100 × 60), arrivée sur la gauche d'une forme en (400, 0) ;
  // un mur en (200, -100, 40 × 260) entre les deux.
  const from = { point: { x: 100, y: 30 }, side: 'e' as const };
  const to = { point: { x: 400, y: 30 }, side: 'w' as const };
  const wall = { x: 200, y: -100, width: 40, height: 260 };

  it('contourne le mur à l’écart réglé, premier et dernier segments au moins à la longueur réglée', () => {
    for (const [clearance, stub] of [
      [10, 20],
      [25, 40],
    ] as const) {
      const options = { ...DEFAULT_AVOID_OPTIONS, clearance, stub };
      const points = routeAround(from, to, [wall], [], undefined, options)!;
      // Premier et dernier coudes à au moins `stub` des formes, dans l'axe du côté.
      expect(points[0]!.y).toBe(30);
      expect(points[0]!.x).toBeGreaterThanOrEqual(100 + stub);
      expect(points[points.length - 1]!.y).toBe(30);
      expect(points[points.length - 1]!.x).toBeLessThanOrEqual(400 - stub);
      // Passe au-dessus ou au-dessous du mur, à `clearance` de lui.
      const ys = points.map((p) => p.y);
      expect(ys.includes(-100 - clearance) || ys.includes(160 + clearance)).toBe(true);
    }
  });

  it('cible derrière le départ : le premier coude tombe à la longueur réglée', () => {
    const source = { x: 0, y: 0, width: 100, height: 60 };
    const target = { x: -200, y: 180, width: 100, height: 60 };
    for (const stub of [20, 40]) {
      const points = routeAround(from, { point: { x: -200, y: 210 }, side: 'w' }, [source, target], [], undefined, {
        ...DEFAULT_AVOID_OPTIONS,
        stub,
      })!;
      expect(points[0]).toEqual({ x: 100 + stub, y: 30 });
    }
  });

  it('écart entre flèches : une seconde flèche du même couloir passe à l’écart réglé', () => {
    for (const spacing of [10, 20]) {
      const options = { ...DEFAULT_AVOID_OPTIONS, spacing };
      const first = routeAround(from, to, [wall], [], undefined, options)!;
      const path = [from.point, ...first, to.point];
      const occupied = path.slice(1).map((b, i) => ({ a: path[i]!, b }));
      const second = routeAround(
        { point: { x: 100, y: 40 }, side: 'e' },
        { point: { x: 400, y: 40 }, side: 'w' },
        [wall],
        occupied,
        undefined,
        options,
      )!;
      // Le passage le long du mur : y du premier et du second écartés de `spacing`.
      const corridor = (points: { y: number }[]) => points.map((p) => p.y).find((y) => y < -100 || y > 160)!;
      expect(Math.abs(corridor(second) - corridor(first))).toBe(spacing);
    }
  });
});
