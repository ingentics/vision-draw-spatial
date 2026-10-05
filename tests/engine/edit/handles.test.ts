import { describe, expect, it } from 'vitest';
import { handlePoints, MIN_SIZE, resizeBounds } from '../../../src/engine/edit/handles';

const RECT = { x: 40, y: 40, width: 120, height: 60 };
const CONNECT = ['connect-n', 'connect-e', 'connect-s', 'connect-w'];

describe('resizeBounds', () => {
  it('coin bas-droit : largeur et hauteur, aimantées à la grille', () => {
    expect(resizeBounds(RECT, 'se', { x: 33, y: 17 }, 10)).toEqual({ x: 40, y: 40, width: 150, height: 80 });
  });

  it('bord gauche : le coin haut-gauche bouge, le bord droit reste', () => {
    expect(resizeBounds(RECT, 'w', { x: -20, y: 50 }, 10)).toEqual({ x: 20, y: 40, width: 140, height: 60 });
  });

  it('ne passe pas sous la taille minimale ni ne se retourne', () => {
    const r = resizeBounds(RECT, 'nw', { x: 500, y: 500 }, 0);
    expect(r).toEqual({ x: 160 - MIN_SIZE, y: 100 - MIN_SIZE, width: MIN_SIZE, height: MIN_SIZE });
  });
});

describe('handlePoints', () => {
  it('huit poignées sur l’emprise, quatre de connexion décalées hors de chaque côté (constant à l’écran)', () => {
    const points = handlePoints(RECT, 2);
    expect(points.map((p) => p.kind)).toEqual([
      'nw',
      'n',
      'ne',
      'e',
      'se',
      's',
      'sw',
      'w',
      'connect-n',
      'connect-e',
      'connect-s',
      'connect-w',
    ]);
    expect(points.find((p) => p.kind === 'se')!.point).toEqual({ x: 160, y: 100 });
    const at = (kind: string) => points.find((p) => p.kind === kind)!.point;
    expect(at('connect-n')).toEqual({ x: 100, y: 31 });
    expect(at('connect-e')).toEqual({ x: 169, y: 70 });
    expect(at('connect-s')).toEqual({ x: 100, y: 109 });
    expect(at('connect-w')).toEqual({ x: 31, y: 70 });
  });

  it('forme étroite ou plate à l’écran : poignées du milieu masquées sur les côtés trop courts', () => {
    const tall = { x: 0, y: 0, width: 20, height: 200 };
    expect(handlePoints(tall, 1).map((p) => p.kind)).toEqual(['nw', 'ne', 'e', 'se', 'sw', 'w', ...CONNECT]);
    // Plus grande à l'écran (zoom) : toutes les poignées reviennent.
    expect(handlePoints(tall, 2).map((p) => p.kind)).toHaveLength(12);
    const flat = { x: 0, y: 0, width: 200, height: 10 };
    expect(handlePoints(flat, 1).map((p) => p.kind)).toEqual(['nw', 'n', 'ne', 'se', 's', 'sw', ...CONNECT]);
  });
});
