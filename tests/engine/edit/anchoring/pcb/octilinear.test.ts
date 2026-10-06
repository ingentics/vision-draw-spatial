import { describe, expect, it } from 'vitest';
import { arrangeAnchors, arrangementConflicts } from '../../../../../src/engine/edit/anchoring/auto/arrange';
import { DEFAULT_AVOID_OPTIONS } from '../../../../../src/engine/edit/anchoring/auto/avoid';
import {
  octilinearRouter,
  pathSegments,
  routeOctilinear,
  segmentsCross,
  segmentsOverlap,
} from '../../../../../src/engine/edit/anchoring/pcb/octilinear';
import { readDrawio } from '../../../../../src/engine/format/parse';
import type { Point, Rect } from '../../../../../src/engine/model/types';

/** Vrai si chaque segment est à 0°, 45° ou 90°. */
const octilinear = (path: Point[]) =>
  pathSegments(path).every(({ a, b }) => {
    const [dx, dy] = [Math.abs(b.x - a.x), Math.abs(b.y - a.y)];
    return dx < 1e-6 || dy < 1e-6 || Math.abs(dx - dy) < 1e-6;
  });
const diagonals = (path: Point[]) =>
  pathSegments(path).filter(({ a, b }) => Math.abs(a.x - b.x) > 1e-6 && Math.abs(a.y - b.y) > 1e-6).length;
/** Vrai si un segment passe à l'intérieur du rectangle (échantillonné). */
const enters = (path: Point[], r: Rect) =>
  pathSegments(path).some(({ a, b }) =>
    Array.from({ length: 101 }, (_, k) => k / 100).some((t) => {
      const [x, y] = [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t];
      return x > r.x && x < r.x + r.width && y > r.y && y < r.y + r.height;
    }),
  );

describe('routeOctilinear', () => {
  const from = { point: { x: 100, y: 30 }, side: 'e' as const };

  it('décalage entre les deux bouts : une diagonale, segments à 0/45/90°, bouts perpendiculaires aux côtés', () => {
    const to = { point: { x: 400, y: 233 }, side: 'w' as const };
    const points = routeOctilinear(from, to, [], [], undefined, DEFAULT_AVOID_OPTIONS)!;
    const path = [from.point, ...points, to.point];
    expect(octilinear(path)).toBe(true);
    expect(diagonals(path)).toBeGreaterThan(0);
    expect(points[0]!.y).toBe(30);
    expect(points[0]!.x).toBeGreaterThanOrEqual(120);
    expect(points[points.length - 1]!.y).toBe(233);
    expect(points[points.length - 1]!.x).toBeLessThanOrEqual(380);
  });

  it('contourne un mur entre les deux formes, à l’écart réglé', () => {
    const to = { point: { x: 400, y: 30 }, side: 'w' as const };
    const wall = { x: 200, y: -100, width: 40, height: 260 };
    const points = routeOctilinear(from, to, [wall], [], undefined, DEFAULT_AVOID_OPTIONS)!;
    const path = [from.point, ...points, to.point];
    expect(octilinear(path)).toBe(true);
    expect(enters(path, { x: 190, y: -110, width: 60, height: 280 })).toBe(false);
  });

  it('évite de croiser une flèche déjà tracée quand un détour existe', () => {
    const to = { point: { x: 400, y: 30 }, side: 'w' as const };
    // Une flèche verticale coupe le passage direct ; elle s'arrête en y = 100.
    const occupied = [{ a: { x: 250, y: -400 }, b: { x: 250, y: 100 } }];
    const points = routeOctilinear(from, to, [], occupied, undefined, DEFAULT_AVOID_OPTIONS)!;
    const path = [from.point, ...points, to.point];
    expect(octilinear(path)).toBe(true);
    expect(pathSegments(path).some((s) => segmentsCross(s, occupied[0]!))).toBe(false);
  });

  it('sans chemin, le tracé direct est accepté (collisions comprises)', () => {
    const to = { point: { x: 400, y: 30 }, side: 'w' as const };
    // Un mur qui enferme le départ : aucun chemin.
    const box = { x: 105, y: -500, width: 30, height: 1000 };
    expect(routeOctilinear(from, to, [box], [], undefined, DEFAULT_AVOID_OPTIONS)).toBeUndefined();
    const router = octilinearRouter(true);
    const points = router.route(from, to, [box], [], undefined, DEFAULT_AVOID_OPTIONS, 0)!;
    expect(points).toBeDefined();
    expect(octilinear([from.point, ...points, to.point])).toBe(true);
  });
});

describe('segments quelconques', () => {
  it('croisement et superposition de diagonales', () => {
    const d1 = { a: { x: 0, y: 0 }, b: { x: 10, y: 10 } };
    expect(segmentsCross(d1, { a: { x: 0, y: 10 }, b: { x: 10, y: 0 } })).toBe(true);
    expect(segmentsCross(d1, { a: { x: 10, y: 10 }, b: { x: 20, y: 0 } })).toBe(false);
    expect(segmentsOverlap(d1, { a: { x: 5, y: 5 }, b: { x: 20, y: 20 } })).toBeCloseTo(Math.SQRT2 * 5);
    expect(segmentsOverlap(d1, { a: { x: 0, y: 1 }, b: { x: 10, y: 11 } })).toBe(0);
  });
});

describe('agencement Typon', () => {
  const shape = (id: string, x: number, y: number) =>
    `<mxCell id="${id}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="100" height="60" as="geometry"/></mxCell>`;
  const edge = (id: string, source: string, target: string) =>
    `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="edgeStyle=orthogonalEdgeStyle;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  const page = readDrawio(
    '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
      [shape('a', 0, 0), shape('b', 400, 200), shape('w', 220, 60), edge('e', 'a', 'b')].join('') +
      '</root></mxGraphModel></diagram></mxfile>',
  ).document.pages[0]!;

  it('trace en octilinéaire, sans traverser la forme du milieu, et compte les conflits sur ce tracé', () => {
    const all = new Set(page.shapes.map((s) => s.id));
    const arrangement = arrangeAnchors(page, all, { route: DEFAULT_AVOID_OPTIONS, router: octilinearRouter(true) });
    const points = arrangement.routes.get('e')!;
    expect(arrangement.router.straight).toBe(true);
    const path = [{ x: 100, y: 30 }, ...points, { x: 400, y: 230 }];
    expect(octilinear(path)).toBe(true);
    expect(diagonals(path)).toBeGreaterThan(0);
    expect(enters(path, { x: 220, y: 60, width: 100, height: 60 })).toBe(false);
    expect(arrangementConflicts(page, arrangement)).toBe(0);
  });
});
