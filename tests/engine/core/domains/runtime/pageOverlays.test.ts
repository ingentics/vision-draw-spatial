import { Group, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { VEIL_ORDER } from '../../../../../src/engine/core/render/veil';
import { takeoverCore } from '../takeoverCore';

const veils = (root: Object3D) => root.children.filter((c) => c.name === 'selection-veil');
const lifted = (root: Object3D, id: string) =>
  root.children.find((c) => c.userData.elementId === id)!.renderOrder > VEIL_ORDER;

describe('couche d’un mode sur la page (sujet 467)', () => {
  it('voile et éléments gardés au-dessus, objets du mode par-dessus tout ; retirée par son détenteur', () => {
    const { core, root, overlay } = takeoverCore({ scene: true });
    const owner = {};
    const object = new Object3D();
    core.overlays.set(owner, { veil: { kept: ['a'] }, layer: () => ({ object }) });
    expect(veils(root)).toHaveLength(1);
    expect(lifted(root, 'a')).toBe(true);
    expect(lifted(root, 'b')).toBe(false);
    expect((overlay.object as Group).children).toEqual([object]);
    core.overlays.clear({});
    expect(veils(root)).toHaveLength(1);
    core.overlays.clear(owner);
    expect(veils(root)).toHaveLength(0);
    expect(lifted(root, 'a')).toBe(false);
    expect(overlay.object).toBeUndefined();
  });

  it('une couche en erreur ne pose que le voile, une seule fois, et l’erreur est signalée', () => {
    const { core, root } = takeoverCore({ scene: true });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    core.overlays.set(
      {},
      {
        veil: {},
        layer: () => {
          throw new Error('boum');
        },
      },
    );
    core.overlays.sync(0);
    core.overlays.sync(16);
    expect(veils(root)).toHaveLength(1);
    expect(core.pluginGuard.warnings()[0]?.message).toContain('Mode essai : erreur dans couche');
    error.mockRestore();
  });

  it('reposée sur une scène reconstruite ; animée avant chaque image tant qu’elle le demande', () => {
    const { core, root } = takeoverCore({ scene: true });
    const animate = vi.fn((elapsed: number) => elapsed < 100);
    const build = vi.fn(() => ({ object: new Object3D(), animate }));
    core.overlays.set({}, { veil: {}, layer: build });
    const now = performance.now();
    core.overlays.sync(now + 50);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(core.rendering.requestRender).toHaveBeenCalled();
    core.overlays.sync(now + 200);
    core.overlays.sync(now + 300);
    // Plus rien à animer : plus rappelée.
    expect(animate).toHaveBeenCalledTimes(2);
    const rebuilt = new Group();
    (core.scenes as { current: unknown }).current = { pageId: 'p', root: rebuilt };
    core.overlays.sync(now + 400);
    expect(build).toHaveBeenCalledTimes(2);
    expect(veils(root)).toHaveLength(0);
    expect(veils(rebuilt)).toHaveLength(1);
  });

  it('animations réduites : la couche n’est pas animée', () => {
    const { core } = takeoverCore({ scene: true, reducedMotion: true });
    const animate = vi.fn(() => true);
    core.overlays.set({}, { layer: () => ({ object: new Object3D(), animate }) });
    core.overlays.sync(performance.now());
    expect(animate).not.toHaveBeenCalled();
  });

  it('retirée au changement de page et de document', () => {
    const { core, root } = takeoverCore({ scene: true });
    core.overlays.set({}, { veil: {} });
    core.overlays.pageShown('p');
    expect(veils(root)).toHaveLength(1);
    core.overlays.pageShown('autre');
    expect(veils(root)).toHaveLength(0);
    core.overlays.set({}, { veil: {} });
    core.overlays.resetDocument();
    expect(veils(root)).toHaveLength(0);
  });
});
