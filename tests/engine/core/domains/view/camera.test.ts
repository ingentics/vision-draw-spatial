import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { ViewCamera } from '../../../../../src/engine/core/domains/view/camera';
import type { CameraState } from '../../../../../src/engine/core/interaction/cameraState';
import type { Rect } from '../../../../../src/engine/core/model/types';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';

// Sujet 527 : garder dans la vue une forme (et ses voisines) pendant une simulation.

const shape = (id: string, x: number) => ({ id, bounds: { x, y: 0, width: 100, height: 100 } });

/** Caméra sur un faux cœur : deux formes, `a` à gauche et `b` loin à droite ; rectangles à l'écran donnés. */
function setup(screen: Record<string, Rect>) {
  const page = { id: 'p', shapes: [shape('a', 0), shape('b', 1000)], edges: [] };
  const core = {
    pages: { getCurrentPage: () => page },
    display: { viewport: { width: 800, height: 600 } },
    projection: { screenRectOf: (id: string) => screen[id] },
    settings: DEFAULT_SETTINGS,
  } as unknown as EngineCore;
  const camera = new ViewCamera(core);
  const moves: CameraState[] = [];
  camera.animateCameraTo = (target) => void moves.push(target);
  return { camera, moves };
}

const INSIDE: Rect = { x: 300, y: 250, width: 100, height: 100 };
const OUTSIDE: Rect = { x: 900, y: 250, width: 100, height: 100 };

describe('garder dans la vue (keepInView)', () => {
  it('forme dans la vue : la caméra ne bouge pas, même si une voisine en sort', () => {
    const { camera, moves } = setup({ a: INSIDE, b: OUTSIDE });
    camera.keepInView('a', { around: ['b'] });
    expect(moves).toEqual([]);
  });

  it('`whole` : une voisine pas entière dans la vue fait cadrer la forme et ses voisines, sans zoom avant', () => {
    const { camera, moves } = setup({ a: INSIDE, b: OUTSIDE });
    camera.keepInView('a', { around: ['b'], whole: true });
    expect(moves).toHaveLength(1);
    expect(moves[0]!.center).toEqual({ x: 550, y: 50 });
    expect(moves[0]!.zoom).toBeLessThanOrEqual(1);
    expect(moves[0]!.mode).toBe('top');
  });

  it('forme sortie de la vue : la caméra glisse vers elle ; forme inconnue : rien', () => {
    const { camera, moves } = setup({ a: OUTSIDE });
    camera.keepInView('a');
    expect(moves[0]!.center).toEqual({ x: 50, y: 50 });
    camera.keepInView('inconnue');
    expect(moves).toHaveLength(1);
  });
});
