import { describe, expect, it } from 'vitest';
import { perimeterToward, routeEdge, routingKind, simplify } from '../../../../src/engine/render/edges/route';
import type { Terminal } from '../../../../src/engine/render/edges/route';

const box = (
  x: number,
  y: number,
  width: number,
  height: number,
  perimeter: Terminal['perimeter'] = 'rectangle',
): Terminal => ({
  bounds: { x, y, width, height },
  perimeter,
});

// Formes de docs/test.drawio
const A = box(120, 200, 120, 80);
const B = box(440, 200, 120, 80);
const C = box(280, 400, 120, 80);

describe('routingKind', () => {
  it('reconnaît les styles courants et signale les autres', () => {
    expect(routingKind({})).toEqual({ kind: 'straight', supported: true });
    expect(routingKind({ edgeStyle: 'orthogonalEdgeStyle' })).toEqual({ kind: 'orthogonal', supported: true });
    expect(routingKind({ edgeStyle: 'elbowEdgeStyle', elbow: 'vertical' })).toEqual({
      kind: 'elbow-vertical',
      supported: true,
    });
    expect(routingKind({ edgeStyle: 'isometricEdgeStyle' })).toEqual({ kind: 'orthogonal', supported: false });
  });
});

describe('routeEdge — orthogonal', () => {
  it('test.drawio : sortie bas de A, entrée gauche de C → un seul coude', () => {
    const style = { edgeStyle: 'orthogonalEdgeStyle', exitX: '0.5', exitY: '1', entryX: '0', entryY: '0.5' };
    expect(routeEdge({ source: A, target: C, waypoints: [], style })).toEqual([
      { x: 180, y: 280 },
      { x: 180, y: 440 },
      { x: 280, y: 440 },
    ]);
  });

  it('formes en vis-à-vis : segment droit au milieu du chevauchement', () => {
    expect(routeEdge({ source: A, target: B, waypoints: [], style: { edgeStyle: 'orthogonalEdgeStyle' } })).toEqual([
      { x: 240, y: 240 },
      { x: 440, y: 240 },
    ]);
  });

  it('formes en diagonale, sans contrainte : coude(s) horizontaux / verticaux uniquement', () => {
    const route = routeEdge({
      source: A,
      target: box(500, 500, 100, 60),
      waypoints: [],
      style: { edgeStyle: 'orthogonalEdgeStyle' },
    });
    expect(route[0]).toEqual({ x: 240, y: 240 }); // côté droit de A
    for (let i = 1; i < route.length; i++) {
      const [a, b] = [route[i - 1]!, route[i]!];
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
    expect(route[route.length - 1]).toEqual({ x: 500, y: 530 }); // côté gauche de la cible
  });

  it('même côté (bas → bas) : contourne par un U', () => {
    const style = { edgeStyle: 'orthogonalEdgeStyle', exitX: '0.5', exitY: '1', entryX: '0.5', entryY: '1' };
    expect(routeEdge({ source: A, target: B, waypoints: [], style })).toEqual([
      { x: 180, y: 280 },
      { x: 180, y: 300 },
      { x: 500, y: 300 },
      { x: 500, y: 280 },
    ]);
  });

  it('points intermédiaires : passe par chacun en segments orthogonaux', () => {
    const route = routeEdge({
      source: A,
      target: B,
      waypoints: [{ x: 300, y: 100 }],
      style: { edgeStyle: 'orthogonalEdgeStyle' },
    });
    const onRoute = route.slice(1).some((b, i) => {
      const a = route[i]!;
      const within = (v: number, p: number, q: number) => v >= Math.min(p, q) && v <= Math.max(p, q);
      return (
        (a.x === b.x && a.x === 300 && within(100, a.y, b.y)) || (a.y === b.y && a.y === 100 && within(300, a.x, b.x))
      );
    });
    expect(onRoute).toBe(true);
    for (let i = 1; i < route.length; i++) {
      const [a, b] = [route[i - 1]!, route[i]!];
      expect(a.x === b.x || a.y === b.y).toBe(true);
    }
  });

  it('points intermédiaires : jamais de demi-tour en arrivant sur la cible', () => {
    // simple.drawio, arête « appelle » : on monte jusqu'au dernier point, au-dessus de la cible.
    const source = box(40, 40, 120, 60);
    const target = box(240, 40, 120, 60);
    const waypoints = [
      { x: 200, y: 70 },
      { x: 200, y: 20 },
    ];
    expect(routeEdge({ source, target, waypoints, style: { edgeStyle: 'orthogonalEdgeStyle' } })).toEqual([
      { x: 160, y: 70 },
      { x: 200, y: 70 },
      { x: 200, y: 20 },
      { x: 300, y: 20 },
      { x: 300, y: 40 },
    ]);
  });

  it('extrémités libres (sans forme)', () => {
    const route = routeEdge({
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 100, y: 50 },
      waypoints: [],
      style: { edgeStyle: 'orthogonalEdgeStyle' },
    });
    expect(route[0]).toEqual({ x: 0, y: 0 });
    expect(route[route.length - 1]).toEqual({ x: 100, y: 50 });
  });
});

describe('routeEdge — droit', () => {
  it('de contour à contour, dans l’axe des centres', () => {
    expect(routeEdge({ source: A, target: B, waypoints: [], style: {} })).toEqual([
      { x: 240, y: 240 },
      { x: 440, y: 240 },
    ]);
  });

  it('points intermédiaires et extrémités libres', () => {
    expect(
      routeEdge({
        sourcePoint: { x: 20, y: 300 },
        targetPoint: { x: 500, y: 320 },
        waypoints: [{ x: 200, y: 300 }],
        style: {},
      }),
    ).toEqual([
      { x: 20, y: 300 },
      { x: 200, y: 300 },
      { x: 500, y: 320 },
    ]);
  });

  it('sans extrémité : pas de tracé', () => {
    expect(routeEdge({ source: A, waypoints: [], style: {} })).toEqual([]);
  });
});

describe('routeEdge — coude', () => {
  it('horizontal par défaut, coude au milieu ou sur le point intermédiaire', () => {
    expect(routeEdge({ source: A, target: C, waypoints: [], style: { edgeStyle: 'elbowEdgeStyle' } })).toEqual([
      { x: 240, y: 240 },
      { x: 260, y: 240 },
      { x: 260, y: 440 },
      { x: 280, y: 440 },
    ]);
    const hinted = routeEdge({
      source: A,
      target: C,
      waypoints: [{ x: 250, y: 0 }],
      style: { edgeStyle: 'elbowEdgeStyle' },
    });
    expect(hinted[1]).toEqual({ x: 250, y: 240 });
  });

  it('vertical', () => {
    expect(
      routeEdge({ source: A, target: C, waypoints: [], style: { edgeStyle: 'elbowEdgeStyle', elbow: 'vertical' } }),
    ).toEqual([
      { x: 180, y: 280 },
      { x: 180, y: 340 },
      { x: 340, y: 340 },
      { x: 340, y: 400 },
    ]);
  });
});

describe('perimeterToward', () => {
  it('rectangle et ellipse', () => {
    expect(perimeterToward(box(0, 0, 100, 50), { x: 200, y: 25 })).toEqual({ x: 100, y: 25 });
    const p = perimeterToward(box(0, 0, 100, 100, 'ellipse'), { x: 100, y: 100 })!;
    expect(Math.hypot(p.x - 50, p.y - 50)).toBeCloseTo(50);
  });
});

describe('simplify', () => {
  it('retire doublons et points alignés, garde les demi-tours', () => {
    expect(
      simplify([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
    ]);
  });
});
