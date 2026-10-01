import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  applyCameraState,
  fitBounds,
  interpolateCamera,
  normalizeAngle,
  normalizeCameraState,
  pageToScreen,
  panByScreen,
  rotateAround,
  sameView,
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

describe('fitBounds avec rotation', () => {
  it('l’emprise tournée tient à l’écran', () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 100 };
    const flat = fitBounds(bounds, viewport, { padding: 0, maxZoom: 10 });
    const quarter = fitBounds(bounds, viewport, { padding: 0, maxZoom: 10, rotation: Math.PI / 2 });
    expect(flat.zoom).toBeCloseTo(0.8); // 800 / 1000
    expect(quarter.zoom).toBeCloseTo(0.6); // tourné d'un quart : 600 / 1000
    expect(quarter.rotation).toBeCloseTo(Math.PI / 2);
  });
});

describe('vue globale ↔ 1:1', () => {
  it('sameView tolère moins d’un pixel d’écart', () => {
    const a = state();
    expect(sameView(a, { ...a, center: { x: 100.2, y: 50 } }, viewport)).toBe(true);
    expect(sameView(a, { ...a, center: { x: 101, y: 50 } }, viewport)).toBe(false);
    expect(sameView(a, { ...a, zoom: 2.1 }, viewport)).toBe(false);
  });

  it('interpolation : extrémités exactes, zoom géométrique, rotation par le plus court chemin', () => {
    const from = state({ zoom: 1, rotation: 3 });
    const to = state({ zoom: 4, rotation: -3, center: { x: 300, y: 50 } });
    expect(interpolateCamera(from, to, 0)).toEqual(from);
    const end = interpolateCamera(from, to, 1);
    expect(end.zoom).toBeCloseTo(4);
    expect(end.center.x).toBeCloseTo(300);
    const mid = interpolateCamera(from, to, 0.5);
    expect(mid.zoom).toBeCloseTo(2);
    expect(Math.abs(mid.rotation)).toBeCloseTo(Math.PI, 1); // passe par π, pas par 0
  });

  it('interpolation : un point de l’écran reste fixe pendant le zoom (vrai zoom, pas de glissade)', () => {
    const from = state({ zoom: 1, center: { x: 0, y: 0 } });
    const to = state({ zoom: 8, center: { x: 350, y: 140 } });
    // Point fixe : P = (c1·z1 − c0·z0) / (z1 − z0)
    const fixed = { x: (350 * 8) / 7, y: (140 * 8) / 7 };
    const screenAt = (t: number) => pageToScreen(interpolateCamera(from, to, t), viewport, fixed);
    const start = screenAt(0);
    for (const t of [0.2, 0.5, 0.8, 1]) {
      expect(screenAt(t).x).toBeCloseTo(start.x, 6);
      expect(screenAt(t).y).toBeCloseTo(start.y, 6);
    }
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
