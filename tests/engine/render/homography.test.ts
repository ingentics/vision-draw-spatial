import { describe, expect, it } from 'vitest';
import { applyHomography, homographyCss, rectToQuad } from '../../../src/engine/render/geometry/homography';

// Étape 61 : l'éditeur de texte se plaque sur le toit vu en perspective.
describe('rectToQuad', () => {
  const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
  };

  it('envoie les coins du rectangle sur ceux du quadrilatère (perspective)', () => {
    const corners = [
      { x: 100, y: 50 },
      { x: 260, y: 70 },
      { x: 240, y: 160 },
      { x: 90, y: 130 },
    ];
    const m = rectToQuad(120, 60, corners);
    close(applyHomography(m, { x: 0, y: 0 }), corners[0]!);
    close(applyHomography(m, { x: 120, y: 0 }), corners[1]!);
    close(applyHomography(m, { x: 120, y: 60 }), corners[2]!);
    close(applyHomography(m, { x: 0, y: 60 }), corners[3]!);
  });

  it('reste affine pour un parallélogramme (vue iso)', () => {
    const corners = [
      { x: 10, y: 20 },
      { x: 50, y: 40 },
      { x: 30, y: 80 },
      { x: -10, y: 60 },
    ];
    const m = rectToQuad(40, 20, corners);
    expect(m[6]).toBe(0);
    expect(m[7]).toBe(0);
    close(applyHomography(m, { x: 20, y: 10 }), { x: 20, y: 50 });
  });

  it('donne une matrix3d CSS (colonnes)', () => {
    const m = rectToQuad(10, 10, [
      { x: 5, y: 7 },
      { x: 25, y: 7 },
      { x: 25, y: 27 },
      { x: 5, y: 27 },
    ]);
    expect(homographyCss(m)).toBe('matrix3d(2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 5, 7, 0, 1)');
  });
});
