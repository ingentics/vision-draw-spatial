import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { frameStats, Metrics } from '../../../../../src/engine/core/domains/runtime/metrics';

/** Cœur réduit à ce que lisent les métriques : document de deux pages, aucune scène, compteurs du rendu. */
function fakeCore(): EngineCore {
  const page = (id: string, shapes: number, edges: number) => ({
    id,
    shapes: Array.from({ length: shapes }),
    edges: Array.from({ length: edges }),
  });
  return {
    rendering: { renderer: { info: { render: { calls: 7 }, memory: { geometries: 12, textures: 3 } } } },
    scenes: { current: undefined },
    pages: { currentPageId: 'p1' },
    file: { document: { pages: [page('p1', 3, 2), page('p2', 1, 0)] } },
  } as unknown as EngineCore;
}

describe('métriques du moteur (sujet 298)', () => {
  it('images de la fenêtre : par seconde, durée moyenne et pire ; aucune image au repos', () => {
    const samples = [
      { at: 500, ms: 20 },
      { at: 1500, ms: 4 },
      { at: 2000, ms: 8 },
      { at: 2900, ms: 12 },
    ];
    // Fenêtre de 2 s finissant à 3000 : la première image en est sortie.
    expect(frameStats(samples, 3000, 2000)).toEqual({ fps: 1.5, averageMs: 8, worstMs: 12 });
    expect(frameStats(samples, 10_000, 2000)).toEqual({ fps: 0, averageMs: 0, worstMs: 0 });
  });

  it('mesure des images seulement quand elle est active ; durées et comptes toujours', () => {
    const metrics = new Metrics(fakeCore());
    expect(metrics.sampling).toBe(false);
    metrics.fileRead(42);
    metrics.sceneBuilt('p1', 5);
    metrics.sceneBuilt('p2', 9);
    expect(metrics.snapshot()).toEqual({
      frames: undefined,
      readMs: 42,
      sceneBuildMs: 5,
      cells: 6,
      sceneObjects: 0,
      drawCalls: 7,
      geometries: 12,
      textures: 3,
    });

    metrics.setSampling(true);
    const now = performance.now();
    metrics.frameRendered(now - 10, now - 6);
    expect(metrics.snapshot().frames).toEqual({ fps: 0.5, averageMs: 4, worstMs: 4 });
    // Désactivée puis réactivée : les images d'avant ne comptent plus.
    metrics.setSampling(false);
    expect(metrics.snapshot().frames).toBeUndefined();
    metrics.setSampling(true);
    expect(metrics.snapshot().frames?.fps).toBe(0);
  });

  it('nouveau document : les durées de construction des scènes sont oubliées', () => {
    const metrics = new Metrics(fakeCore());
    metrics.sceneBuilt('p1', 5);
    metrics.resetDocument();
    expect(metrics.snapshot().sceneBuildMs).toBeUndefined();
  });
});
