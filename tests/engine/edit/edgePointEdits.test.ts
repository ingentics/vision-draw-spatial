import { describe, expect, it } from 'vitest';
import { dragPoints, pointHandles, pointsEditor, removePoint } from '../../../src/engine/edit/edgePointEdits';
import type { PointsContext } from '../../../src/engine/edit/edgePointEdits';
import type { Point } from '../../../src/engine/model/types';
import { routeEdgePoints, routingCenter } from '../../../src/engine/render/edges/route';
import type { Terminal } from '../../../src/engine/render/edges/route';

const A: Terminal = { bounds: { x: 0, y: 0, width: 80, height: 40 }, perimeter: 'rectangle' };
const B: Terminal = { bounds: { x: 240, y: 0, width: 80, height: 40 }, perimeter: 'rectangle' };

function context(style: Record<string, string>, waypoints: Point[] = []): PointsContext {
  const reroute = (points: Point[]) => routeEdgePoints({ source: A, target: B, waypoints: points, style });
  return {
    editor: pointsEditor(style),
    route: reroute(waypoints),
    waypoints,
    source: A.bounds,
    target: B.bounds,
    sourceAnchor: routingCenter(A),
    targetAnchor: routingCenter(B),
    reroute,
    tolerance: 4,
    handleRadius: 6,
  };
}

describe('pointsEditor', () => {
  it('suit l’éditeur de draw.io selon le style', () => {
    expect(pointsEditor({ edgeStyle: 'orthogonalEdgeStyle' })).toBe('segments');
    expect(pointsEditor({ edgeStyle: 'segmentEdgeStyle' })).toBe('segments');
    expect(pointsEditor({ edgeStyle: 'elbowEdgeStyle' })).toBe('elbow');
    expect(pointsEditor({ edgeStyle: 'topToBottomEdgeStyle' })).toBe('elbow');
    expect(pointsEditor({})).toBe('points');
  });
});

describe('flèche droite', () => {
  it('poignée virtuelle au milieu ; la tirer ajoute un point', () => {
    const ctx = context({});
    const handles = pointHandles(ctx);
    expect(handles).toEqual([{ kind: 'virtual', index: 0, point: { x: 160, y: 20 }, faded: true }]);
    expect(dragPoints(ctx, handles[0]!, { x: 160, y: 100 })).toEqual([{ x: 160, y: 100 }]);
  });

  it('un point remis dans l’alignement de ses voisins disparaît', () => {
    const ctx = context({}, [{ x: 160, y: 100 }]);
    const point = pointHandles(ctx).find((h) => h.kind === 'point')!;
    expect(dragPoints(ctx, point, { x: 160, y: 22 })).toEqual([]);
    expect(dragPoints(ctx, point, { x: 160, y: 60 })).toEqual([{ x: 160, y: 60 }]);
  });

  it('un point posé sur une autre poignée disparaît', () => {
    const ctx = context({}, [
      { x: 160, y: 100 },
      { x: 200, y: 120 },
    ]);
    const first = pointHandles(ctx).find((h) => h.kind === 'point' && h.index === 1)!;
    expect(dragPoints(ctx, first, { x: 202, y: 118 })).toEqual([{ x: 200, y: 120 }]);
  });

  it('double-clic : point retiré', () => {
    expect(
      removePoint(
        [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        1,
      ),
    ).toEqual([{ x: 2, y: 2 }]);
  });
});

describe('coude', () => {
  it('une seule poignée, qui fixe le coude', () => {
    const ctx = context({ edgeStyle: 'elbowEdgeStyle' });
    const handles = pointHandles(ctx);
    expect(handles).toHaveLength(1);
    expect(dragPoints(ctx, handles[0]!, { x: 120, y: 30 })).toEqual([{ x: 120, y: 30 }]);
  });
});

describe('segments (orthogonal)', () => {
  it('tracé droit : trois poignées, celle du milieu crée un détour par le pointeur', () => {
    const ctx = context({ edgeStyle: 'orthogonalEdgeStyle' });
    const handles = pointHandles(ctx);
    expect(handles.map((h) => h.faded)).toEqual([true, false, true]);
    const points = dragPoints(ctx, handles[1]!, { x: 160, y: 100 });
    const route = ctx.reroute(points);
    expect(route.some((p, i) => i > 0 && p.y === 100 && route[i - 1]!.y === 100)).toBe(true);
  });
});
