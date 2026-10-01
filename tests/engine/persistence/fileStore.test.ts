import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import type { FileStore, StoredFile } from '../../../src/engine/persistence/FileStore';
import { IndexedDbStore } from '../../../src/engine/persistence/IndexedDbStore';
import { MemoryStore } from '../../../src/engine/persistence/MemoryStore';

const camera = { mode: 'top' as const, center: { x: 1, y: 2 }, zoom: 1.5, rotation: 0.2, tilt: 0 };

const file = (id: string, lastOpenedAt: number, patch: Partial<StoredFile> = {}): StoredFile => ({
  id,
  name: `${id}.drawio`,
  content: `<mxfile id="${id}"/>`,
  size: 20,
  lastOpenedAt,
  cameraByPage: {},
  ...patch,
});

const stores: Array<[string, () => FileStore]> = [
  ['MemoryStore', () => new MemoryStore()],
  ['IndexedDbStore', () => new IndexedDbStore('test', new IDBFactory())],
];

describe.each(stores)('%s', (_name, create) => {
  let store: FileStore;
  afterEach(async () => {
    await (store as Partial<IndexedDbStore>).close?.();
  });

  it('put / get : aller-retour complet, contenu et état de consultation', async () => {
    store = create();
    const stored = file('a', 10, {
      lastPageId: 'p2',
      cameraByPage: { p1: camera },
      history: [{ pageId: 'p1', elementId: 'c', targetPageId: 'p2', camera }],
      linkUsage: { 'p1>p2': 123 },
    });
    await store.put(stored);
    expect(await store.get('a')).toEqual(stored);
    expect(await store.get('absent')).toBeUndefined();
  });

  it('listRecent : le plus récemment ouvert en premier, sans le contenu, limité', async () => {
    store = create();
    await store.put(file('old', 1));
    await store.put(file('new', 3, { lastPageId: 'p9' }));
    await store.put(file('mid', 2));
    const recent = await store.listRecent();
    expect(recent.map((f) => f.id)).toEqual(['new', 'mid', 'old']);
    expect(recent[0]).toEqual({ id: 'new', name: 'new.drawio', lastOpenedAt: 3, size: 20, lastPageId: 'p9' });
    expect(recent[0]).not.toHaveProperty('content');
    expect((await store.listRecent(2)).map((f) => f.id)).toEqual(['new', 'mid']);
  });

  it('updateMeta : fusionne sans toucher au contenu ; ignore un fichier absent', async () => {
    store = create();
    await store.put(file('a', 1, { cameraByPage: { p1: camera } }));
    await store.updateMeta('a', { lastOpenedAt: 5, lastPageId: 'p2', cameraByPage: { p1: camera, p2: camera } });
    const updated = await store.get('a');
    expect(updated).toMatchObject({ lastOpenedAt: 5, lastPageId: 'p2', content: '<mxfile id="a"/>' });
    expect(Object.keys(updated!.cameraByPage)).toEqual(['p1', 'p2']);
    await store.updateMeta('absent', { lastOpenedAt: 9 });
    expect(await store.get('absent')).toBeUndefined();
  });

  it('remove', async () => {
    store = create();
    await store.put(file('a', 1));
    await store.remove('a');
    expect(await store.get('a')).toBeUndefined();
    expect(await store.listRecent()).toEqual([]);
  });

  it('les objets rendus sont des copies', async () => {
    store = create();
    await store.put(file('a', 1, { cameraByPage: { p1: camera } }));
    const copy = (await store.get('a'))!;
    copy.cameraByPage.p1!.zoom = 99;
    expect((await store.get('a'))!.cameraByPage.p1!.zoom).toBe(1.5);
  });
});
