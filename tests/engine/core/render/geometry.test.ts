import { describe, expect, it } from 'vitest';
import {
  cornerRadius,
  ellipsePath,
  rectPath,
  roundedRectPath,
} from '../../../../src/engine/core/render/geometry/paths';
import {
  dashPattern,
  dashPolyline,
  offsetOutline,
  strokeTriangles,
} from '../../../../src/engine/core/render/geometry/stroke';

const rect = { x: 10, y: 20, width: 100, height: 40 };

function extent(values: number[]) {
  const xs = values.filter((_, i) => i % 2 === 0);
  const ys = values.filter((_, i) => i % 2 === 1);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

describe('contours', () => {
  it('rectangle', () => {
    expect(rectPath(rect)).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 60 },
      { x: 10, y: 60 },
    ]);
  });

  it('rectangle arrondi : reste dans les bornes, rayon borné', () => {
    const points = roundedRectPath(rect, 500);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(p.x).toBeLessThanOrEqual(110 + 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(p.y).toBeLessThanOrEqual(60 + 1e-9);
    }
    expect(roundedRectPath(rect, 0)).toEqual(rectPath(rect));
  });

  it('ellipse inscrite dans les bornes', () => {
    const points = ellipsePath(rect, 4);
    expect(points[0]).toEqual({ x: 110, y: 40 });
    expect(points[1]!.x).toBeCloseTo(60);
    expect(points[1]!.y).toBeCloseTo(60);
  });

  it('rayon des coins selon arcSize', () => {
    expect(cornerRadius({}, rect)).toBe(6); // 15 % de 40
    expect(cornerRadius({ arcSize: '50' }, rect)).toBe(20);
    expect(cornerRadius({ absoluteArcSize: '1' }, rect)).toBe(10);
    expect(cornerRadius({ absoluteArcSize: '1', arcSize: '8' }, rect)).toBe(4);
  });
});

describe('strokeTriangles', () => {
  it('segment ouvert : ruban centré sur la ligne', () => {
    const tri = strokeTriangles(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      2,
      false,
    );
    expect(tri).toHaveLength(12); // 2 triangles
    expect(extent(tri)).toEqual({ minX: 0, maxX: 10, minY: -1, maxY: 1 });
  });

  it('contour fermé : angles en onglet, épaisseur centrée sur le bord', () => {
    const tri = strokeTriangles(rectPath({ x: 0, y: 0, width: 10, height: 10 }), 2, true);
    expect(tri).toHaveLength(4 * 12);
    const e = extent(tri);
    expect(e.minX).toBeCloseTo(-1);
    expect(e.maxX).toBeCloseTo(11);
    expect(e.minY).toBeCloseTo(-1);
    expect(e.maxY).toBeCloseTo(11);
  });

  it('ignore points dupliqués et largeur nulle', () => {
    expect(
      strokeTriangles(
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        2,
        false,
      ),
    ).toEqual([]);
    expect(strokeTriangles(rectPath(rect), 0, true)).toEqual([]);
  });
});

describe('offsetOutline', () => {
  it('décale un contour vers l’extérieur, quel que soit son sens de parcours', () => {
    const square = rectPath({ x: 0, y: 0, width: 10, height: 10 });
    expect(offsetOutline(square, 1)).toEqual([
      { x: -1, y: -1 },
      { x: 11, y: -1 },
      { x: 11, y: 11 },
      { x: -1, y: 11 },
    ]);
    const reversed = [...square].reverse();
    expect(offsetOutline(reversed, 1)[0]).toEqual({ x: -1, y: 11 });
  });
});

describe('pointillés', () => {
  it('découpe une ligne selon le motif', () => {
    const dashes = dashPolyline(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [3, 2],
      false,
    );
    expect(dashes.map((d) => [d[0]!.x, d[d.length - 1]!.x])).toEqual([
      [0, 3],
      [5, 8],
    ]);
  });

  it('un tiret peut franchir un angle', () => {
    const dashes = dashPolyline(
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
      ],
      [3, 10],
      false,
    );
    expect(dashes).toEqual([
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
      ],
    ]);
  });

  it('contour fermé : le dernier côté est aussi pointillé', () => {
    const dashes = dashPolyline(rectPath({ x: 0, y: 0, width: 10, height: 10 }), [5, 5], true);
    expect(dashes).toHaveLength(4);
  });

  it('décalage : les tirets glissent le long du tracé (sélection animée)', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const starts = (offset: number) => dashPolyline(line, [3, 2], false, offset).map((d) => +d[0]!.x.toFixed(6));
    expect(starts(0)).toEqual([0, 5]);
    // Décalage de 1 dans le motif : le premier tiret est entamé, tous reculent d'une unité.
    expect(starts(1)).toEqual([0, 4, 9]);
    // Décalage négatif : les tirets avancent ; un tour complet du motif ne change rien.
    expect(starts(-1)).toEqual([1, 6]);
    expect(starts(5)).toEqual(starts(0));
  });

  it('motif draw.io : « 3 3 » × épaisseur, sauf fixDash', () => {
    expect(dashPattern({}, 1)).toBeUndefined();
    expect(dashPattern({ dashed: '1' }, 2)).toEqual([6, 6]);
    expect(dashPattern({ dashed: '1', dashPattern: '8 4 1 4' }, 1)).toEqual([8, 4, 1, 4]);
    expect(dashPattern({ dashed: '1', fixDash: '1' }, 3)).toEqual([3, 3]);
  });
});
