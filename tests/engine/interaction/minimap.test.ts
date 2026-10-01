import { describe, expect, it } from 'vitest';
import type { CameraState } from '../../../src/engine/interaction/camera';
import { minimapLayout, minimapToPage, pageToMinimap, viewFootprint } from '../../../src/engine/interaction/minimap';

const viewport = { width: 800, height: 600 };
const camera = (patch: Partial<CameraState> = {}): CameraState => ({
  mode: 'top',
  center: { x: 400, y: 300 },
  zoom: 2,
  rotation: 0,
  tilt: 0,
  ...patch,
});

describe('minimapLayout', () => {
  it('largeur fixe, hauteur selon les proportions de la page, page centrée avec marge', () => {
    const layout = minimapLayout({ x: 120, y: 200, width: 440, height: 280 }, 200);
    expect(layout.width).toBe(200);
    expect(layout.height).toBe(Math.round(184 * (280 / 440) + 16));
    const topLeft = pageToMinimap(layout, { x: 120, y: 200 });
    const bottomRight = pageToMinimap(layout, { x: 560, y: 480 });
    // Tient dans les marges (8 px), centrée horizontalement.
    expect(topLeft.x).toBeGreaterThanOrEqual(8 - 1e-9);
    expect(bottomRight.x).toBeLessThanOrEqual(192 + 1e-9);
    expect((topLeft.x + bottomRight.x) / 2).toBeCloseTo(100);
    expect(topLeft.y).toBeGreaterThanOrEqual(8 - 1e-9);
    expect((topLeft.y + bottomRight.y) / 2).toBeCloseTo(layout.height / 2);
  });

  it('hauteur bornée (pages très plates ou très hautes)', () => {
    expect(minimapLayout({ x: 0, y: 0, width: 5000, height: 10 }, 200).height).toBe(70);
    expect(minimapLayout({ x: 0, y: 0, width: 10, height: 5000 }, 200).height).toBe(200);
  });

  it('conversions mini-carte ↔ page inverses', () => {
    const layout = minimapLayout({ x: -50, y: 30, width: 900, height: 400 }, 240);
    const p = { x: 123.4, y: 321 };
    const back = minimapToPage(layout, pageToMinimap(layout, p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });
});

describe('viewFootprint', () => {
  it('vue de dessus : rectangle aligné, taille écran / zoom', () => {
    expect(viewFootprint(camera(), viewport)).toEqual([
      { x: 200, y: 150 },
      { x: 600, y: 150 },
      { x: 600, y: 450 },
      { x: 200, y: 450 },
    ]);
  });

  it('iso : rectangle tourné et allongé de 1 / cos(inclinaison), centré sur la vue', () => {
    const tilt = Math.PI / 3; // cos = 0,5
    const footprint = viewFootprint(camera({ mode: 'iso', tilt, rotation: Math.PI / 4 }), viewport);
    const side = (a: number, b: number) =>
      Math.hypot(footprint[b]!.x - footprint[a]!.x, footprint[b]!.y - footprint[a]!.y);
    expect(side(0, 1)).toBeCloseTo(400); // largeur inchangée
    expect(side(1, 2)).toBeCloseTo(600); // hauteur : 300 / cos 60°
    const center = footprint.reduce((acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }), { x: 0, y: 0 });
    expect(center.x).toBeCloseTo(400);
    expect(center.y).toBeCloseTo(300);
  });
});
