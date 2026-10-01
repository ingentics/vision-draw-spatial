import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import type { PageModel } from '../../../src/engine/model/types';
import type { PageScene } from '../../../src/engine/render/pageScene';
import { SceneManager } from '../../../src/engine/render/sceneManager';

const page = (id: string): PageModel => ({
  id,
  name: id,
  layers: [],
  shapes: [],
  edges: [],
  bounds: { x: 0, y: 0, width: 0, height: 0 },
});

function setup(maxCached = 3) {
  const container = new Group();
  const built: string[] = [];
  const disposed: string[] = [];
  const manager = new SceneManager(
    container,
    (p): PageScene => {
      built.push(p.id);
      const root = new Group();
      root.name = p.id;
      return { pageId: p.id, root, dispose: () => disposed.push(p.id) };
    },
    maxCached,
  );
  const visible = () => container.children.filter((c) => c.visible).map((c) => c.name);
  return { container, manager, built, disposed, visible };
}

describe('SceneManager', () => {
  it('construit une page à la première visite seulement, puis la reprend du cache', () => {
    const { manager, built } = setup();
    manager.show(page('a'));
    manager.show(page('b'));
    manager.show(page('a'));
    expect(built).toEqual(['a', 'b']);
    expect(manager.current?.pageId).toBe('a');
  });

  it('une seule page visible à la fois', () => {
    const { manager, visible } = setup();
    manager.show(page('a'));
    manager.show(page('b'));
    expect(visible()).toEqual(['b']);
    manager.show(page('a'));
    expect(visible()).toEqual(['a']);
  });

  it('plafond du cache : libère la page la moins récemment affichée', () => {
    const { manager, disposed, container } = setup(2);
    manager.show(page('a'));
    manager.show(page('b'));
    manager.show(page('a')); // a redevient la plus récente
    manager.show(page('c'));
    expect(disposed).toEqual(['b']);
    expect(manager.cachedIds()).toEqual(['a', 'c']);
    expect(container.children.map((c) => c.name).sort()).toEqual(['a', 'c']);
  });

  it('ne libère jamais la page courante', () => {
    const { manager, disposed } = setup(1);
    manager.show(page('a'));
    manager.prebuild(page('b'));
    expect(disposed).toEqual(['b']);
    expect(manager.current?.pageId).toBe('a');
  });

  it('préchargement : construite mais invisible', () => {
    const { manager, visible, built } = setup();
    manager.show(page('a'));
    manager.prebuild(page('b'));
    expect(built).toEqual(['a', 'b']);
    expect(visible()).toEqual(['a']);
    expect(manager.has('b')).toBe(true);
  });

  it('clear libère tout (nouveau document)', () => {
    const { manager, disposed, container } = setup();
    manager.show(page('a'));
    manager.show(page('b'));
    manager.clear();
    expect(disposed.sort()).toEqual(['a', 'b']);
    expect(container.children).toHaveLength(0);
    expect(manager.current).toBeUndefined();
  });
});
