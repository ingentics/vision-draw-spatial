import { describe, expect, it } from 'vitest';
import { pageToScreen } from '../../../src/engine/interaction/camera';
import type { CameraState } from '../../../src/engine/interaction/camera';
import { coverBounds, easing, embedIn, equivalentCamera, phase } from '../../../src/engine/interaction/transitions';

const viewport = { width: 800, height: 600 };

describe('coverBounds', () => {
  it('la forme recouvre tout l’écran (aucun bord visible)', () => {
    const shape = { x: 280, y: 400, width: 120, height: 80 };
    const camera = coverBounds(shape, viewport, 0);
    expect(camera.zoom).toBeCloseTo(Math.max(800 / 120, 600 / 80));
    const topLeft = pageToScreen(camera, viewport, { x: shape.x, y: shape.y });
    const bottomRight = pageToScreen(camera, viewport, { x: shape.x + shape.width, y: shape.y + shape.height });
    expect(topLeft.x).toBeLessThanOrEqual(0);
    expect(topLeft.y).toBeLessThanOrEqual(1e-9);
    expect(bottomRight.x).toBeGreaterThanOrEqual(800);
    expect(bottomRight.y).toBeGreaterThanOrEqual(600 - 1e-9);
  });
});

describe('embedIn', () => {
  it('pose la page cible au centre de la forme, avec marge', () => {
    const page = { x: 354, y: 220, width: 120, height: 140 };
    const frame = { x: 280, y: 400, width: 120, height: 80 };
    const { scale, offset } = embedIn(page, frame, 0.1);
    expect(scale).toBeCloseTo((80 * 0.8) / 140);
    const map = (p: { x: number; y: number }) => ({ x: scale * p.x + offset.x, y: scale * p.y + offset.y });
    const center = map({ x: 414, y: 290 });
    expect(center.x).toBeCloseTo(340);
    expect(center.y).toBeCloseTo(440);
  });
});

describe('equivalentCamera', () => {
  it('bascule invisible : chaque point est au même endroit à l’écran', () => {
    const embedding = { scale: 0.4, offset: { x: 150, y: 300 } };
    const camera: CameraState = { mode: 'top', center: { x: 340, y: 440 }, zoom: 6.6, rotation: 0.3 };
    const equivalent = equivalentCamera(camera, embedding);
    for (const p of [
      { x: 354, y: 220 },
      { x: 474, y: 360 },
      { x: 400, y: 300 },
    ]) {
      const embedded = { x: embedding.scale * p.x + embedding.offset.x, y: embedding.scale * p.y + embedding.offset.y };
      const before = pageToScreen(camera, viewport, embedded);
      const after = pageToScreen(equivalent, viewport, p);
      expect(after.x).toBeCloseTo(before.x, 6);
      expect(after.y).toBeCloseTo(before.y, 6);
    }
  });
});

describe('easing et phases', () => {
  it('courbes bornées de 0 à 1, inconnue → ease-in-out', () => {
    for (const name of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'inconnue']) {
      const f = easing(name);
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(1);
    }
    expect(easing('inconnue')(0.25)).toBeCloseTo(easing('ease-in-out')(0.25));
  });

  it('phase : progression locale d’une sous-partie', () => {
    expect(phase(0.2, 0.35, 0.7)).toBe(0);
    expect(phase(0.525, 0.35, 0.7)).toBeCloseTo(0.5);
    expect(phase(0.9, 0.35, 0.7)).toBe(1);
  });
});
