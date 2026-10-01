import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyCameraState, fitBounds, pageToScreen, screenToPage } from '../../../src/engine/interaction/camera';

const viewport = { width: 800, height: 600 };

describe('fitBounds', () => {
  it('centre et ne dépasse pas 100 % pour un petit schéma', () => {
    expect(fitBounds({ x: 120, y: 200, width: 440, height: 280 }, viewport)).toEqual({
      mode: 'top',
      center: { x: 340, y: 340 },
      zoom: 1,
    });
  });

  it('dézoome pour faire tenir un grand schéma, marge comprise', () => {
    const state = fitBounds({ x: 0, y: 0, width: 4000, height: 1000 }, viewport, { padding: 0 });
    expect(state.zoom).toBeCloseTo(0.2);
  });

  it('page vide : zoom par défaut', () => {
    expect(fitBounds({ x: 0, y: 0, width: 0, height: 0 }, viewport).zoom).toBe(1);
  });
});

describe('applyCameraState', () => {
  it('vue de dessus : x → droite de l’écran, y → bas de l’écran', () => {
    const camera = new OrthographicCamera();
    const state = { mode: 'top' as const, center: { x: 100, y: 50 }, zoom: 2 };
    applyCameraState(camera, state, viewport);
    camera.updateMatrixWorld();

    const ndc = (x: number, y: number) => new Vector3(x, 0, y).project(camera);
    expect(ndc(100, 50).x).toBeCloseTo(0);
    expect(ndc(100, 50).y).toBeCloseTo(0);
    // 200 px page à droite × zoom 2 = 400 px écran = bord droit.
    expect(ndc(300, 50).x).toBeCloseTo(1);
    // y draw.io croissant = vers le bas de l'écran (NDC y négatif).
    expect(ndc(100, 200).y).toBeCloseTo(-1);
  });
});

describe('conversions écran ↔ page', () => {
  it('sont inverses l’une de l’autre', () => {
    const state = { mode: 'top' as const, center: { x: 100, y: 50 }, zoom: 2 };
    expect(screenToPage(state, viewport, { x: 400, y: 300 })).toEqual({ x: 100, y: 50 });
    expect(pageToScreen(state, viewport, screenToPage(state, viewport, { x: 13, y: 577 }))).toEqual({ x: 13, y: 577 });
  });
});
