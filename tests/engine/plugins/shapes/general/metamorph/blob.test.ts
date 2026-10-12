import { describe, expect, it } from 'vitest';
import { boundsOfPoints, insidePolygon } from '../../../../../../src/engine/core/model/geometry';
import { blobOutline, outerRing } from '../../../../../../src/engine/plugins/shapes/general/metamorph/blob';

describe('contour en blob de la Metamorph (sujet 539)', () => {
  const bounds = { x: 100, y: 50, width: 80, height: 100 };
  const outline = blobOutline(bounds);

  it('remplit ses bornes et contient son centre', () => {
    const box = boundsOfPoints(outline)!;
    expect(box.x).toBeCloseTo(bounds.x, 0);
    expect(box.y).toBeCloseTo(bounds.y, 0);
    expect(box.x + box.width).toBeCloseTo(bounds.x + bounds.width, 0);
    expect(box.y + box.height).toBeCloseTo(bounds.y + bounds.height, 0);
    expect(insidePolygon(outline, { x: 140, y: 100 })).toBe(true);
    // Coin haut-droit des bornes : hors du blob.
    expect(insidePolygon(outline, { x: 179, y: 51 })).toBe(false);
  });

  it('halo : chaque point poussé vers l’extérieur, de la largeur demandée', () => {
    for (const { inner, outer } of outerRing(outline, 6)) {
      expect(Math.hypot(outer.x - inner.x, outer.y - inner.y)).toBeCloseTo(6);
    }
    const outside = outerRing(outline, 6).filter(({ outer }) => !insidePolygon(outline, outer));
    expect(outside.length).toBe(outline.length);
  });
});
