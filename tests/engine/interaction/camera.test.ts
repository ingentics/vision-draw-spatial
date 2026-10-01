import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  applyCameraState,
  fitBounds,
  normalizeAngle,
  normalizeCameraState,
  pageToScreen,
  panByScreen,
  rotateAround,
  screenToPage,
  zoomAt,
} from '../../../src/engine/interaction/camera';
import type { CameraState } from '../../../src/engine/interaction/camera';

const viewport = { width: 800, height: 600 };
const state = (patch: Partial<CameraState> = {}): CameraState => ({
  mode: 'top',
  center: { x: 100, y: 50 },
  zoom: 2,
  rotation: 0,
  ...patch,
});

function expectPoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
}

describe('fitBounds', () => {
  it('centre, ne dépasse pas 100 % et remet le nord en haut', () => {
    expect(fitBounds({ x: 120, y: 200, width: 440, height: 280 }, viewport)).toEqual({
      mode: 'top',
      center: { x: 340, y: 340 },
      zoom: 1,
      rotation: 0,
    });
  });

  it('dézoome pour faire tenir un grand schéma', () => {
    expect(fitBounds({ x: 0, y: 0, width: 4000, height: 1000 }, viewport, { padding: 0 }).zoom).toBeCloseTo(0.2);
  });

  it('page vide : zoom par défaut', () => {
    expect(fitBounds({ x: 0, y: 0, width: 0, height: 0 }, viewport).zoom).toBe(1);
  });
});

describe('normalisation', () => {
  it('complète un état sans rotation et borne le zoom', () => {
    expect(normalizeCameraState({ center: { x: 1, y: 2 }, zoom: 1000 })).toEqual({
      mode: 'top',
      center: { x: 1, y: 2 },
      zoom: 16,
      rotation: 0,
    });
  });

  it('ramène les angles dans ]-π, π]', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2 - 2 * Math.PI)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('applyCameraState', () => {
  const project = (s: CameraState, x: number, y: number) => {
    const camera = new OrthographicCamera();
    applyCameraState(camera, s, viewport);
    camera.updateMatrixWorld();
    return new Vector3(x, 0, y).project(camera);
  };

  it('sans rotation : x → droite de l’écran, y → bas de l’écran', () => {
    expect(project(state(), 100, 50).x).toBeCloseTo(0);
    expect(project(state(), 300, 50).x).toBeCloseTo(1); // 200 px × zoom 2 = bord droit
    expect(project(state(), 100, 200).y).toBeCloseTo(-1); // y croissant = bas (NDC négatif)
  });

  it('concorde avec pageToScreen, rotation comprise', () => {
    const s = state({ rotation: 0.7 });
    for (const p of [
      { x: 130, y: 20 },
      { x: 60, y: 110 },
    ]) {
      const ndc = project(s, p.x, p.y);
      const screen = pageToScreen(s, viewport, p);
      expect(((ndc.x + 1) / 2) * viewport.width).toBeCloseTo(screen.x, 4);
      expect(((1 - ndc.y) / 2) * viewport.height).toBeCloseTo(screen.y, 4);
    }
  });
});

describe('conversions écran ↔ page', () => {
  it('sont inverses l’une de l’autre, avec ou sans rotation', () => {
    for (const rotation of [0, 1.2, -2.5]) {
      const s = state({ rotation });
      expectPoint(screenToPage(s, viewport, { x: 400, y: 300 }), { x: 100, y: 50 });
      expectPoint(pageToScreen(s, viewport, screenToPage(s, viewport, { x: 13, y: 577 })), { x: 13, y: 577 });
    }
  });
});

describe('navigation', () => {
  it('panByScreen : le point attrapé suit le pointeur', () => {
    for (const rotation of [0, 0.9]) {
      const before = state({ rotation });
      const grabbed = screenToPage(before, viewport, { x: 200, y: 100 });
      const after = panByScreen(before, { x: 35, y: -20 });
      expectPoint(pageToScreen(after, viewport, grabbed), { x: 235, y: 80 });
    }
  });

  it('zoomAt : le point sous le curseur reste fixe, zoom borné', () => {
    const cursor = { x: 650, y: 120 };
    const before = state({ rotation: 0.4 });
    const anchor = screenToPage(before, viewport, cursor);
    const after = zoomAt(before, viewport, cursor, 1.5);
    expect(after.zoom).toBeCloseTo(3);
    expectPoint(pageToScreen(after, viewport, anchor), cursor);
    expect(zoomAt(before, viewport, cursor, 1e6).zoom).toBe(16);
  });

  it('rotateAround : le pivot reste fixe à l’écran', () => {
    const pivot = { x: 250, y: 400 };
    const before = state();
    const anchor = screenToPage(before, viewport, pivot);
    const after = rotateAround(before, viewport, pivot, Math.PI / 3);
    expect(after.rotation).toBeCloseTo(Math.PI / 3);
    expectPoint(pageToScreen(after, viewport, anchor), pivot);
  });
});
