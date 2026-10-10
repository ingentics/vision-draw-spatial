import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { ImageExport } from '../../../../../src/engine/core/domains/view/imageExport';
import type { ImageExportOptions } from '../../../../../src/engine/core/domains/view/imageExport';

const OPTIONS: ImageExportOptions = { density: 1, margin: 10, transparent: false, selectionOnly: false };

/** Cœur réduit : page courante, sélection, scène construite (sans rien de dessiné), textes à attendre. */
function setup(options: { page?: boolean; selection?: string[] } = {}) {
  const log: string[] = [];
  const page = { id: 'p', shapes: [], edges: [] };
  const core = {
    pages: { getCurrentPage: () => (options.page === false ? undefined : page) },
    selection: {
      current: options.selection && { pageId: 'p', items: options.selection.map((id) => ({ element: { id } })) },
      withContent: (_page: unknown, items: Array<{ element: { id: string } }>) =>
        new Set(items.map((item) => item.element.id)),
    },
    sceneView: {
      buildScene: () => {
        log.push('build');
        return { root: new Group(), dispose: () => log.push('dispose') };
      },
    },
    text: {
      settled: () => {
        log.push('settled');
        return Promise.resolve();
      },
    },
  } as unknown as EngineCore;
  return { exporter: new ImageExport(core), log };
}

describe('ImageExport.exportPng', () => {
  it('sans page courante : rien', async () => {
    const { exporter, log } = setup({ page: false });
    expect(await exporter.exportPng(OPTIONS)).toBeUndefined();
    expect(log).toEqual([]);
  });

  it('sélection seule mais rien de sélectionné : rien, sans construire de scène', async () => {
    const { exporter, log } = setup();
    expect(await exporter.exportPng({ ...OPTIONS, selectionOnly: true })).toBeUndefined();
    expect(log).toEqual([]);
  });

  it('rien de dessiné : rien ; les textes sont attendus avant la mesure, la scène est libérée', async () => {
    const { exporter, log } = setup({ selection: ['a'] });
    expect(await exporter.exportPng({ ...OPTIONS, selectionOnly: true })).toBeUndefined();
    expect(log).toEqual(['build', 'settled', 'dispose']);
  });
});
