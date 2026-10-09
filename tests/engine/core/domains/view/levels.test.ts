import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { Levels } from '../../../../../src/engine/core/domains/view/levels';
import { traced } from '../traced';

/** Niveaux réels sur un cœur traçant (sujet 385) : scènes, vue graphe, mise en valeur, mini-carte, rendu. */
function setup() {
  const log: string[] = [];
  const page = { id: 'p' };
  const core = {
    pages: { getCurrentPage: () => page },
    scenes: traced(log, 'scenes', { current: undefined }),
    graph: traced(log, 'graph'),
    highlight: traced(log, 'highlight'),
    minimap: traced(log, 'minimap'),
    rendering: traced(log, 'rendering'),
  } as unknown as EngineCore;
  return { levels: new Levels(core), log };
}

describe('reconstruction des scènes (sujet 421)', () => {
  it('toutes : scènes vidées, page courante réaffichée', () => {
    const { levels, log } = setup();
    levels.rebuildScenes();
    expect(log).toEqual([
      'scenes.clear',
      'scenes.show',
      'highlight.update',
      'minimap.invalidate',
      'rendering.requestRender',
    ]);
  });

  it('pages données : leurs scènes et celles de la vue graphe, puis page courante réaffichée', () => {
    const { levels, log } = setup();
    levels.rebuildScenes(['p', 'q']);
    expect(log).toEqual([
      'scenes.invalidate',
      'scenes.invalidate',
      'graph.invalidateWithScenes',
      'scenes.show',
      'highlight.update',
      'minimap.invalidate',
      'rendering.requestRender',
    ]);
  });
});
