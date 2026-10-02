import { describe, expect, it } from 'vitest';
import { handlePoints, MIN_SIZE, resizeBounds } from '../../../src/engine/edit/handles';

const RECT = { x: 40, y: 40, width: 120, height: 60 };

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
  it('huit poignées sur l’emprise, connexion décalée à droite (constante à l’écran)', () => {
    const points = handlePoints(RECT, 2);
    expect(points.map((p) => p.kind)).toEqual(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'connect']);
    expect(points.find((p) => p.kind === 'se')!.point).toEqual({ x: 160, y: 100 });
    expect(points.find((p) => p.kind === 'connect')!.point).toEqual({ x: 169, y: 70 });
  });
});
