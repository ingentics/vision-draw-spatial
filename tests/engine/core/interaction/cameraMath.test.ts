import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  defaultView,
  fitBounds,
  needsRecentring,
  nextOverviewStep,
  sameView,
} from '../../../../src/engine/core/interaction/cameraFraming';
import {
  dragGround,
  interpolateCamera,
  orbit,
  panByScreen,
  revealShift,
  rotateAround,
  tiltAround,
  zoomAt,
} from '../../../../src/engine/core/interaction/cameraMoves';
import {
  applyCameraState,
  applyPerspectiveState,
  pageToScreen,
  screenToPage,
} from '../../../../src/engine/core/interaction/cameraProjection';
import {
  cameraLimitsOf,
  DEFAULT_CAMERA_LIMITS,
  FLAT_FOV,
  MAX_TILT_3D,
  MAX_ZOOM_3D,
  MIN_ZOOM_3D,
  normalizeAngle,
  normalizeCameraState,
  PERSPECTIVE_FOV,
  settleProjection,
  tiltFromElevation,
  withViewMode,
} from '../../../../src/engine/core/interaction/cameraState';
import type { CameraLimits, CameraState } from '../../../../src/engine/core/interaction/cameraState';

const viewport = { width: 800, height: 600 };
const state = (patch: Partial<CameraState> = {}): CameraState => ({
  mode: 'top',
  center: { x: 100, y: 50 },
  zoom: 2,
  rotation: 0,
  tilt: 0,
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
      tilt: 0,
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
    const from = state({ zoom: 1, rotation: 3, tilt: 0 });
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

describe('Entrée avec une sélection (ticket 242)', () => {
  const views = {
    selection: state({ zoom: 2, center: { x: 10, y: 10 } }),
    actual: state({ zoom: 1, center: { x: 0, y: 0 } }),
    global: state({ zoom: 0.5, center: { x: 400, y: 300 } }),
  };

  it('une vue quelconque part de la sélection, puis 1:1, globale et retour à la sélection', () => {
    const other = state({ zoom: 3, center: { x: -50, y: 0 } });
    let last = nextOverviewStep(other, views, undefined, viewport);
    expect(last.step).toBe('selection');
    const steps = [last.step];
    for (let i = 0; i < 3; i++) {
      last = nextOverviewStep(last.view, views, last, viewport);
      steps.push(last.step);
    }
    expect(steps).toEqual(['selection', 'actual', 'global', 'selection']);
  });

  it('reconnaît la vue globale ou sélection sans étape mémorisée', () => {
    expect(nextOverviewStep(views.global, views, undefined, viewport).step).toBe('selection');
    expect(nextOverviewStep(views.selection, views, undefined, viewport).step).toBe('actual');
  });

  it('saute une étape qui ne changerait rien', () => {
    const same = { ...views, selection: views.global };
    expect(nextOverviewStep(views.global, same, undefined, viewport).step).toBe('actual');
  });
});

describe('texte édité amené à l’écran (ticket 240)', () => {
  it('ne bouge pas une boîte déjà visible avec sa marge', () => {
    expect(revealShift({ x: 20, y: 20, width: 100, height: 50 }, viewport, 20)).toEqual({ x: 0, y: 0 });
  });

  it('déplace juste assez une boîte coupée, sur chaque axe', () => {
    expect(revealShift({ x: -30, y: 560, width: 100, height: 50 }, viewport, 20)).toEqual({ x: 50, y: -30 });
    expect(revealShift({ x: 750, y: 10, width: 100, height: 50 }, viewport, 20)).toEqual({ x: -70, y: 10 });
  });

  it('aligne le coin haut-gauche sur la marge pour une boîte plus grande que le canvas', () => {
    expect(revealShift({ x: 100, y: -40, width: 900, height: 100 }, viewport, 20)).toEqual({ x: -80, y: 60 });
  });
});

describe('normalisation', () => {
  it('complète un état sans rotation et borne le zoom', () => {
    expect(normalizeCameraState({ center: { x: 1, y: 2 }, zoom: 1000 })).toEqual({
      mode: 'top',
      center: { x: 1, y: 2 },
      zoom: 16,
      rotation: 0,
      tilt: 0,
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
    const s = state({ rotation: 0.7, tilt: 0 });
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
    const before = state({ rotation: 0.4, tilt: 0 });
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

describe('mode isométrique (inclinaison)', () => {
  const iso = (patch: Partial<CameraState> = {}) => state({ mode: 'iso', tilt: tiltFromElevation(35.26), ...patch });

  it('élévation 35,26° (isométrie vraie) → inclinaison ≈ 54,74° ; bornée', () => {
    expect((tiltFromElevation(35.26) * 180) / Math.PI).toBeCloseTo(54.74, 2);
    expect(tiltFromElevation(90)).toBe(0);
    expect((tiltFromElevation(-10) * 180) / Math.PI).toBeCloseTo(80);
  });

  it('la caméra Three.js inclinée projette exactement comme pageToScreen (rotation comprise)', () => {
    const camera = new OrthographicCamera();
    for (const s of [iso(), iso({ rotation: 0.8, zoom: 0.7 }), iso({ tilt: 1.2, rotation: -2 })]) {
      applyCameraState(camera, s, viewport);
      camera.updateMatrixWorld();
      for (const p of [
        { x: 130, y: 20 },
        { x: -60, y: 410 },
        { x: 100, y: 50 },
      ]) {
        const ndc = new Vector3(p.x, 0, p.y).project(camera);
        const screen = pageToScreen(s, viewport, p);
        expect(((ndc.x + 1) / 2) * viewport.width).toBeCloseTo(screen.x, 4);
        expect(((1 - ndc.y) / 2) * viewport.height).toBeCloseTo(screen.y, 4);
        expect(Math.abs(ndc.z)).toBeLessThan(1); // dans le volume de vue (ni trop près ni trop loin)
      }
    }
  });

  it('écran ↔ sol restent inverses ; le sol est écrasé verticalement de cos(inclinaison)', () => {
    const s = iso({ rotation: 0 });
    expectPoint(pageToScreen(s, viewport, screenToPage(s, viewport, { x: 13, y: 577 })), { x: 13, y: 577 });
    const a = pageToScreen(s, viewport, { x: 100, y: 50 });
    const b = pageToScreen(s, viewport, { x: 100, y: 150 });
    expect(b.y - a.y).toBeCloseTo(100 * s.zoom * Math.cos(s.tilt));
  });

  it('navigation cohérente : pan, zoom au curseur et rotation gardent leur point fixe', () => {
    const s = iso({ rotation: 0.5 });
    const grabbed = screenToPage(s, viewport, { x: 200, y: 100 });
    expectPoint(pageToScreen(panByScreen(s, { x: 30, y: 40 }), viewport, grabbed), { x: 230, y: 140 });
    const anchor = screenToPage(s, viewport, { x: 650, y: 120 });
    expectPoint(pageToScreen(zoomAt(s, viewport, { x: 650, y: 120 }, 1.7), viewport, anchor), { x: 650, y: 120 });
    const pivot = screenToPage(s, viewport, { x: 250, y: 400 });
    expectPoint(pageToScreen(rotateAround(s, viewport, { x: 250, y: 400 }, 1), viewport, pivot), { x: 250, y: 400 });
  });

  it('tiltAround : le pivot reste fixe, inclinaison bornée à [0, 80°]', () => {
    const s = iso();
    const pivot = screenToPage(s, viewport, { x: 300, y: 450 });
    const tilted = tiltAround(s, viewport, { x: 300, y: 450 }, 0.2);
    expectPoint(pageToScreen(tilted, viewport, pivot), { x: 300, y: 450 });
    expect(tiltAround(s, viewport, { x: 0, y: 0 }, 10).tilt).toBeCloseTo((80 * Math.PI) / 180);
    expect(tiltAround(s, viewport, { x: 0, y: 0 }, -10).tilt).toBe(0);
  });

  it('fitBounds incliné : la page tient à l’écran malgré la hauteur raccourcie', () => {
    const bounds = { x: 0, y: 0, width: 400, height: 1000 };
    const top = fitBounds(bounds, viewport, { padding: 0, maxZoom: 10 });
    const tilted = fitBounds(bounds, viewport, { padding: 0, maxZoom: 10, tilt: Math.PI / 3 });
    expect(top.zoom).toBeCloseTo(0.6);
    expect(tilted.zoom).toBeCloseTo(1.2); // hauteur à l'écran divisée par 2 (cos 60°)
    expect(tilted.mode).toBe('iso');
  });

  it('withViewMode : la 2D n’est jamais tournée, l’iso part de son azimut, rotation gardée dans le même mode', () => {
    const s = state({ rotation: 0.3 });
    const toIso = withViewMode(s, 'iso', 0.9, Math.PI / 4);
    expect(toIso).toMatchObject({ mode: 'iso', tilt: 0.9, center: s.center, zoom: s.zoom });
    expect(toIso.rotation).toBeCloseTo(Math.PI / 4);
    const back = withViewMode({ ...toIso, rotation: toIso.rotation + 0.2 }, 'top', 0.9, Math.PI / 4);
    expect(back).toMatchObject({ mode: 'top', tilt: 0, rotation: 0 });
    // Déjà dans le mode demandé : seule l'inclinaison est ajustée.
    const turned = { ...toIso, rotation: 1.2 };
    expect(withViewMode(turned, 'iso', 0.5, Math.PI / 4).rotation).toBeCloseTo(1.2);
  });

  it('état stable : jamais de rotation en 2D ; iso tournée conservée', () => {
    expect(settleProjection(state({ rotation: 0.7 })).rotation).toBe(0);
    expect(settleProjection(state({ mode: 'iso', tilt: 0.9, rotation: 0.7 })).rotation).toBe(0.7);
  });

  it('orbite en iso : rotation autour du centre, élévation inchangée', () => {
    const s = state({ mode: 'iso', tilt: 0.9, rotation: 0.2 });
    const turned = orbit(s, 0.5, 0);
    expect(turned).toMatchObject({ center: s.center, tilt: 0.9 });
    expect(turned.rotation).toBeCloseTo(0.7);
  });

  it('états anciens sans inclinaison : vue de dessus', () => {
    expect(normalizeCameraState({ center: { x: 0, y: 0 }, zoom: 1, rotation: 0 })).toMatchObject({
      mode: 'top',
      tilt: 0,
    });
  });
});

describe('vue 3D (perspective)', () => {
  const persp = (patch: Partial<CameraState> = {}) =>
    state({ mode: '3d', tilt: 0.8, rotation: 0.4, zoom: 1, fov: PERSPECTIVE_FOV, ...patch });

  it('écran ↔ sol inverses l’un de l’autre, au sol comme en hauteur', () => {
    const s = persp();
    for (const screen of [
      { x: 400, y: 300 },
      { x: 30, y: 40 },
      { x: 770, y: 590 },
    ]) {
      expectPoint(pageToScreen(s, viewport, screenToPage(s, viewport, screen)), screen);
      expectPoint(pageToScreen(s, viewport, screenToPage(s, viewport, screen, 40), 40), screen);
    }
  });

  it('au centre de l’écran, même échelle qu’en orthographique ; le lointain rapetisse', () => {
    const s = persp({ zoom: 2 });
    expectPoint(screenToPage(s, viewport, { x: 400, y: 300 }), s.center);
    const right = screenToPage(s, viewport, { x: 401, y: 300 });
    expect(Math.hypot(right.x - s.center.x, right.y - s.center.y)).toBeCloseTo(0.5, 3);
    // Un pixel en haut de l'écran couvre plus de sol qu'un pixel en bas.
    const span = (y: number) => {
      const a = screenToPage(s, viewport, { x: 400, y });
      const b = screenToPage(s, viewport, { x: 401, y });
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    expect(span(50)).toBeGreaterThan(span(550));
  });

  it('concorde avec la caméra three.js', () => {
    const s = persp();
    const camera = new PerspectiveCamera();
    applyPerspectiveState(camera, s, viewport);
    camera.updateMatrixWorld();
    const page = { x: 180, y: -20 };
    const ndc = new Vector3(page.x, 15, page.y).project(camera);
    const expected = pageToScreen(s, viewport, page, 15);
    expect(((ndc.x + 1) / 2) * viewport.width).toBeCloseTo(expected.x, 3);
    expect(((1 - ndc.y) / 2) * viewport.height).toBeCloseTo(expected.y, 3);
  });

  it('champ de vision quasi nul (bascule iso ↔ 3D) : plan proche serré, sans couper ce qui est visible', () => {
    const camera = new PerspectiveCamera();
    // 3D ordinaire : plan proche à 2 % de la distance, comme avant.
    applyPerspectiveState(camera, persp(), viewport);
    const distance = (s: CameraState) => camera.position.distanceTo(new Vector3(s.center.x, 0, s.center.y));
    expect(camera.near).toBeCloseTo(distance(persp()) * 0.02, 6);
    // Étape 195 : à `FLAT_FOV`, la caméra recule très loin ; le plan proche suit (précision en profondeur).
    const flat = persp({ fov: FLAT_FOV, zoom: 0.5 });
    applyPerspectiveState(camera, flat, viewport);
    camera.updateMatrixWorld();
    expect(camera.near / distance(flat)).toBeGreaterThan(0.8);
    // Les coins de la vue, au sol comme en hauteur, restent entre les plans proche et lointain.
    for (const screen of [
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 0, y: 600 },
      { x: 800, y: 600 },
    ])
      for (const height of [0, 200]) {
        const page = screenToPage(flat, viewport, screen, height);
        const z = new Vector3(page.x, height, page.y).project(camera).z;
        expect(Math.abs(z)).toBeLessThan(1);
      }
  });

  it('zoom borné (dézoom et zoom maximaux) ; le point sous le curseur reste fixe', () => {
    const s = persp();
    const cursor = { x: 200, y: 150 };
    const anchor = screenToPage(s, viewport, cursor);
    const zoomed = zoomAt(s, viewport, cursor, 1.5);
    expectPoint(pageToScreen(zoomed, viewport, anchor), cursor);
    expect(zoomAt(s, viewport, cursor, 1000).zoom).toBe(MAX_ZOOM_3D);
    expect(zoomAt(s, viewport, cursor, 0.0001).zoom).toBe(MIN_ZOOM_3D);
  });

  it('glisser : le point du sol attrapé suit le pointeur', () => {
    const s = persp();
    const from = { x: 300, y: 120 };
    const to = { x: 420, y: 260 };
    const grabbed = screenToPage(s, viewport, from);
    expectPoint(pageToScreen(dragGround(s, viewport, from, to), viewport, grabbed), to);
  });

  it('orbite autour du centre : rotation libre, inclinaison bornée', () => {
    const s = persp();
    const turned = orbit(s, 1, 0);
    expect(turned.center).toEqual(s.center);
    expect(turned.rotation).toBeCloseTo(1.4);
    expect(orbit(s, 0, 10).tilt).toBeCloseTo(MAX_TILT_3D);
    expect(orbit(s, 0, -10).tilt).toBe(0);
  });

  it('bascule : depuis iso, garde l’orientation ; vers 2D, nord en haut ; vers iso, l’azimut iso', () => {
    const iso = state({ mode: 'iso', tilt: 0.9, rotation: 0.6, zoom: 30 });
    const three = withViewMode(iso, '3d', 0.9, -Math.PI / 4);
    expect(three).toMatchObject({ mode: '3d', tilt: 0.9, rotation: 0.6, zoom: MAX_ZOOM_3D, fov: PERSPECTIVE_FOV });
    const top = withViewMode({ ...three, rotation: 2 }, 'top', 0.9, -Math.PI / 4);
    expect(top).toMatchObject({ mode: 'top', tilt: 0, rotation: 0 });
    expect(top.fov).toBeUndefined();
    expect(withViewMode({ ...three, rotation: 2 }, 'iso', 0.9, -Math.PI / 4).rotation).toBeCloseTo(-Math.PI / 4);
  });

  it('interpolation : la perspective part de presque rien et arrive pleine ; bascule interrompue stabilisée', () => {
    const from = state({ mode: 'iso', tilt: 0.9 });
    const to = persp({ tilt: 0.9 });
    expect(interpolateCamera(from, to, 0).fov).toBeCloseTo(FLAT_FOV);
    expect(interpolateCamera(from, to, 1).fov).toBe(PERSPECTIVE_FOV);
    const back = interpolateCamera(to, from, 1);
    expect(back.fov).toBeUndefined();
    const halfway = interpolateCamera(to, from, 0.5);
    expect(settleProjection(halfway).fov).toBeUndefined();
    expect(settleProjection(interpolateCamera(from, to, 0.5)).fov).toBe(PERSPECTIVE_FOV);
  });

  it('fitBounds en 3D : les coins projetés tiennent à l’écran', () => {
    const bounds = { x: 0, y: 0, width: 2000, height: 1200 };
    const fit = fitBounds(bounds, viewport, { padding: 20, maxZoom: 10, mode: '3d', tilt: 0.9, rotation: 0.3 });
    expect(fit.mode).toBe('3d');
    for (const corner of [
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 0, y: 1200 },
      { x: 2000, y: 1200 },
    ]) {
      const p = pageToScreen(fit, viewport, corner);
      expect(p.x).toBeGreaterThanOrEqual(19);
      expect(p.x).toBeLessThanOrEqual(781);
      expect(p.y).toBeGreaterThanOrEqual(19);
      expect(p.y).toBeLessThanOrEqual(581);
    }
  });
});

describe('vue par défaut (bouton Réinitialiser la vue)', () => {
  const bounds = { x: 0, y: 0, width: 400, height: 300 };
  const isoTilt = (35 * Math.PI) / 180;
  const azimuth = Math.PI / 4;

  it('2D : nord en haut, page entière à au plus 100 %', () => {
    expect(defaultView(bounds, viewport, 'top', isoTilt, azimuth)).toEqual(fitBounds(bounds, viewport));
  });

  it('iso : orientation et élévation des réglages, page centrée', () => {
    const view = defaultView(bounds, viewport, 'iso', isoTilt, azimuth);
    expect(view).toMatchObject({ mode: 'iso', center: { x: 200, y: 150 } });
    expect(view.rotation).toBeCloseTo(azimuth);
    expect(view.tilt).toBeCloseTo(isoTilt);
  });

  it('3D : perspective sur l’orientation iso, page entière', () => {
    const view = defaultView(bounds, viewport, '3d', isoTilt, azimuth);
    expect(view.mode).toBe('3d');
    expect(view.fov).toBeDefined();
    expect(view.rotation).toBeCloseTo(azimuth);
    expect(view.zoom).toBeLessThanOrEqual(1);
  });
});

describe('bornes de caméra propres à chaque moteur (sujet 204)', () => {
  const custom: CameraLimits = {
    ...DEFAULT_CAMERA_LIMITS,
    maxZoom: 3,
    maxZoom3d: 2,
    maxTilt3d: (30 * Math.PI) / 180,
    fov: (60 * Math.PI) / 180,
  };

  it('les bornes passées en paramètre s’appliquent, sans toucher aux bornes par défaut', () => {
    const center = { x: 400, y: 300 };
    expect(zoomAt(state({ zoom: 2 }), viewport, center, 10, custom).zoom).toBe(3);
    expect(zoomAt(state({ zoom: 2 }), viewport, center, 10).zoom).toBe(DEFAULT_CAMERA_LIMITS.maxZoom);
    const view3d = withViewMode(state({ zoom: 8 }), '3d', 0.5, 0, custom);
    expect(view3d.zoom).toBe(2);
    expect(view3d.fov).toBe(custom.fov);
    expect(withViewMode(state({ zoom: 8 }), '3d', 0.5).fov).toBe(PERSPECTIVE_FOV);
    expect(orbit(view3d, 0, 1, custom).tilt).toBeCloseTo(custom.maxTilt3d);
    expect(orbit(view3d, 0, 1).tilt).toBeCloseTo(MAX_TILT_3D);
    expect(settleProjection(state({ mode: '3d' }), custom).fov).toBe(custom.fov);
    expect(normalizeCameraState(state({ zoom: 50 }), custom).zoom).toBe(3);
    expect(normalizeCameraState(state({ zoom: 50 })).zoom).toBe(DEFAULT_CAMERA_LIMITS.maxZoom);
  });
});

describe('cameraLimitsOf', () => {
  it('reprend les zooms et convertit les angles des réglages en radians', () => {
    const limits = cameraLimitsOf({
      minZoom: 0.1,
      maxZoom: 8,
      minZoom3d: 0.2,
      maxZoom3d: 3,
      maxTilt3dDeg: 60,
      fovDeg: 90,
      animationMs: 250,
      focusMaxZoom: 2,
      focusPadding: 80,
    });
    expect(limits).toEqual({
      minZoom: 0.1,
      maxZoom: 8,
      minZoom3d: 0.2,
      maxZoom3d: 3,
      maxTilt3d: Math.PI / 3,
      fov: Math.PI / 2,
    });
  });
});

describe('forme gardée dans la vue (sujet 467)', () => {
  const viewport = { width: 800, height: 600 };

  it('une forme qui tient dans la vue y reste entière, loin des bords', () => {
    expect(needsRecentring({ x: 100, y: 100, width: 100, height: 60 }, viewport, 48)).toBe(false);
    expect(needsRecentring({ x: 100, y: 540, width: 100, height: 60 }, viewport, 48)).toBe(true);
    expect(needsRecentring({ x: -20, y: 100, width: 100, height: 60 }, viewport, 48)).toBe(true);
  });

  it('une forme plus grande que la vue : recentrée seulement si elle n’y est plus du tout', () => {
    expect(needsRecentring({ x: -100, y: -100, width: 1000, height: 800 }, viewport, 48)).toBe(false);
    expect(needsRecentring({ x: 900, y: 0, width: 1000, height: 800 }, viewport, 48)).toBe(true);
  });
});
