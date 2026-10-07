import { describe, expect, it } from 'vitest';
import { clampMove, clampResize } from '../../../src/engine/edit/obstacles';

/** Obstacle à droite : 300..400 × 0..100 ; écart 20 → limite à x = 280. */
const right = { x: 300, y: 0, width: 100, height: 100 };

describe('bornes d’un geste (sujet 241)', () => {
  it('déplacement : arrêt à l’écart de l’obstacle en face, limite montrée sur toute sa longueur', () => {
    const moving = [{ x: 0, y: 0, width: 200, height: 80 }];
    const { value, limits } = clampMove(moving, [right], 20, { x: 150, y: 0 });
    expect(value).toEqual({ x: 80, y: 0 });
    expect(limits).toEqual([
      [
        { x: 280, y: -20 },
        { x: 280, y: 120 },
      ],
    ]);
  });

  it('déplacement : libre en deçà de la limite ; glisse le long de l’obstacle sur l’autre axe', () => {
    const moving = [{ x: 0, y: 0, width: 200, height: 80 }];
    expect(clampMove(moving, [right], 20, { x: 50, y: 0 })).toEqual({ value: { x: 50, y: 0 }, limits: [] });
    // Vers la droite et un peu vers le bas, toujours en face : x borné, y libre (on glisse le long de l'obstacle).
    expect(clampMove(moving, [right], 20, { x: 150, y: 30 }).value).toEqual({ x: 80, y: 30 });
    // En diagonale jusque sous l'obstacle : plus en face à l'arrivée, rien ne borne.
    expect(clampMove(moving, [right], 20, { x: 150, y: 200 })).toEqual({ value: { x: 150, y: 200 }, limits: [] });
  });

  it('déplacement : un obstacle sans face-à-face ne borne pas ; par le haut, borné en y', () => {
    const below = { x: 0, y: 300, width: 200, height: 100 };
    const moving = [{ x: 0, y: 0, width: 200, height: 80 }];
    expect(clampMove(moving, [below], 20, { x: 0, y: 500 }).value).toEqual({ x: 0, y: 200 });
    expect(clampMove(moving, [{ x: 500, y: 500, width: 10, height: 10 }], 20, { x: 100, y: 100 }).value).toEqual({
      x: 100,
      y: 100,
    });
  });

  it('pas à pas le long d’un chemin : on contourne l’obstacle par chaque côté (sujet 241)', () => {
    // Région (200 × 80) sous un obstacle (0..200 × 0..100) ; on la promène autour, pas de 20 px, comme un glisser.
    const obstacle = { x: 0, y: 0, width: 200, height: 100 };
    const start = { x: 0, y: 200, width: 200, height: 80 };
    const walk = (points: Array<[number, number]>) => {
      let at = { x: 0, y: 0 };
      for (const [tx, ty] of points) {
        const steps = 10;
        const from = { ...at };
        for (let i = 1; i <= steps; i++) {
          const target = { x: from.x + ((tx - from.x) * i) / steps, y: from.y + ((ty - from.y) * i) / steps };
          const here = { ...start, x: start.x + at.x, y: start.y + at.y };
          const step = clampMove([here], [obstacle], 20, { x: target.x - at.x, y: target.y - at.y }).value;
          at = { x: at.x + step.x, y: at.y + step.y };
        }
      }
      return { ...start, x: start.x + at.x, y: start.y + at.y };
    };
    const clear = (r: { x: number; y: number; width: number; height: number }) =>
      r.x + r.width <= -20 + 1e-6 || r.x >= 220 - 1e-6 || r.y + r.height <= -20 + 1e-6 || r.y >= 120 - 1e-6;
    // Par la droite, jusqu'au-dessus : la région finit au-dessus de l'obstacle, pas en dessous.
    const overRight = walk([
      [300, 0],
      [300, -400],
      [0, -400],
    ]);
    expect(overRight).toEqual({ x: 0, y: -200, width: 200, height: 80 });
    // Par la gauche, puis à droite de l'obstacle.
    expect(
      walk([
        [-300, 0],
        [-300, -400],
        [300, -400],
        [300, -200],
      ]),
    ).toEqual({ x: 300, y: 0, width: 200, height: 80 });
    // Tout droit vers le haut : arrêtée sous l'obstacle, à 20 px.
    const straight = walk([[0, -400]]);
    expect(straight).toEqual({ x: 0, y: 120, width: 200, height: 80 });
    expect([overRight, straight].every(clear)).toBe(true);
  });

  it('redimensionnement : le bord qui avance vers l’obstacle s’arrête à l’écart ; l’autre bord est libre', () => {
    const origin = { x: 0, y: 0, width: 200, height: 80 };
    const { value, limits } = clampResize(origin, { x: 0, y: 0, width: 400, height: 80 }, [right], 20);
    expect(value).toEqual({ x: 0, y: 0, width: 280, height: 80 });
    expect(limits).toHaveLength(1);
    expect(clampResize(origin, { x: -50, y: 0, width: 250, height: 80 }, [right], 20)).toEqual({
      value: { x: -50, y: 0, width: 250, height: 80 },
      limits: [],
    });
  });
});
