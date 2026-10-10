import { describe, expect, it, vi } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { SceneView } from '../../../../../src/engine/core/domains/view/scene';
import type { PageModel } from '../../../../../src/engine/core/model/types';

describe('scènes construites et métriques (sujet 453)', () => {
  it('une scène de la vue est comptée, une scène hors de la vue (export) ne l’est pas', () => {
    const built: string[] = [];
    const core = { metrics: { sceneBuilt: (pageId: string) => built.push(pageId) } } as unknown as EngineCore;
    const view = new SceneView(core);
    // Construction elle-même hors sujet : seule la mesure est vérifiée.
    vi.spyOn(view as unknown as { createScene: () => unknown }, 'createScene').mockReturnValue({});
    const page = { id: 'p' } as PageModel;
    view.buildDetachedScene(page, 'flat');
    expect(built).toEqual([]);
    view.buildScene(page, 'flat');
    expect(built).toEqual(['p']);
  });
});
