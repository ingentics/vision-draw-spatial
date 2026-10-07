import { describe, expect, it } from 'vitest';
import { squareEnd } from '../../../../src/engine/core/edit/squareEnd';
import { routeEdgePoints } from '../../../../src/engine/core/render/edges/route';
import type { Terminal } from '../../../../src/engine/core/render/edges/route';
import type { Point } from '../../../../src/engine/core/model/types';

// Source en haut à gauche, cible plus bas ; la flèche descend à x = 150 (un coude enregistré).
const SOURCE: Terminal = { id: 'a', bounds: { x: 100, y: 0, width: 100, height: 60 }, perimeter: 'rectangle' };
const TARGET: Terminal = { id: 'b', bounds: { x: 100, y: 200, width: 200, height: 60 }, perimeter: 'rectangle' };
const STYLE = { edgeStyle: 'orthogonalEdgeStyle', exitX: '0.5', exitY: '1', entryX: '0.75', entryY: '0' };

const reroute = (waypoints: Point[], style: Record<string, string> = STYLE) =>
  routeEdgePoints({ source: SOURCE, target: TARGET, waypoints, style });

describe('squareEnd', () => {
  it('tête posée en haut de la forme : arrive verticalement, après un coude 20 px au-dessus', () => {
    const waypoints = [{ x: 150, y: 200 }];
    const route = reroute(waypoints);
    // Avant : le dernier segment longe le haut de la cible.
    expect(route[route.length - 2]!.y).toBe(200);
    const squared = squareEnd(route, 'target', 'n', reroute)!;
    expect(squared).toEqual([
      { x: 150, y: 180 },
      { x: 250, y: 180 },
    ]);
    const after = reroute(squared);
    const [c, a] = after.slice(-2);
    expect(a!.x).toBeCloseTo(250);
    expect(a!.y).toBeCloseTo(200);
    expect(c!.x).toBeCloseTo(250);
    expect(c!.y).toBeLessThan(200);
  });

  it('départ posé sur un côté : premier segment perpendiculaire', () => {
    // Départ sur la droite de la source, le tracé longe ce côté vers le bas avant de tourner.
    const style = { ...STYLE, exitX: '1', exitY: '0.5', entryX: '0.75', entryY: '0' };
    const waypoints = [{ x: 200, y: 120 }];
    const route = reroute(waypoints, style);
    const squared = squareEnd(route, 'source', 'e', (w) => reroute(w, style))!;
    expect(squared).toEqual([
      { x: 220, y: 30 },
      { x: 220, y: 120 },
      { x: 250, y: 120 },
    ]);
    const [a, c] = reroute(squared, style);
    expect(a!.x).toBeCloseTo(200);
    expect(a!.y).toBeCloseTo(30);
    expect(c!.y).toBeCloseTo(30);
    expect(c!.x).toBeGreaterThan(200);
  });

  it('bout déjà perpendiculaire : rien à changer', () => {
    const waypoints = [
      { x: 150, y: 120 },
      { x: 250, y: 120 },
    ];
    expect(squareEnd(reroute(waypoints), 'target', 'n', reroute)).toBeUndefined();
  });
});
