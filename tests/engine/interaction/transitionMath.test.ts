import { describe, expect, it } from 'vitest';
import { pageToScreen } from '../../../src/engine/interaction/cameraMath';
import type { CameraState } from '../../../src/engine/interaction/cameraMath';
import {
  easing,
  embedIn,
  embeddedCamera,
  equivalentCamera,
  phase,
} from '../../../src/engine/interaction/transitionMath';

const viewport = { width: 800, height: 600 };

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
    const camera: CameraState = { mode: 'top', center: { x: 340, y: 440 }, zoom: 6.6, rotation: 0.3, tilt: 0 };
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

describe('embeddedCamera', () => {
  it('inverse de equivalentCamera : la vue finale sur la page posée dans la forme', () => {
    const embedding = { scale: 0.4, offset: { x: 150, y: 300 } };
    const destination: CameraState = { mode: 'top', center: { x: 414, y: 290 }, zoom: 1.8, rotation: 0.2, tilt: 0 };
    const inSource = embeddedCamera(destination, embedding);
    expect(inSource.zoom).toBeCloseTo(4.5);
    const back = equivalentCamera(inSource, embedding);
    expect(back.zoom).toBeCloseTo(destination.zoom);
    expect(back.center.x).toBeCloseTo(destination.center.x);
    expect(back.center.y).toBeCloseTo(destination.center.y);
    // Même image : la page transformée vue par inSource = la page vue par destination.
    const p = { x: 380, y: 250 };
    const embedded = { x: 0.4 * p.x + 150, y: 0.4 * p.y + 300 };
    const a = pageToScreen(inSource, viewport, embedded);
    const b = pageToScreen(destination, viewport, p);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.y).toBeCloseTo(b.y, 6);
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
