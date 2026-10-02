import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import type { FileStore, StoredFile } from '../../../src/engine/persistence/FileStore';
import { IndexedDbStore } from '../../../src/engine/persistence/IndexedDbStore';
import { FsStore, isFilePath } from '../../../src/engine/persistence/FsStore';
import type { FileSystemAccess } from '../../../src/engine/persistence/FsStore';
import { MemoryStore } from '../../../src/engine/persistence/MemoryStore';

/** Système de fichiers en mémoire, comme celui de l'appli native (main.cjs). */
function memoryFs(files: Record<string, string> = {}) {
  const disk = new Map(Object.entries(files));
  let library: string | undefined;
  const writes: string[] = [];
  const fs: FileSystemAccess = {
    readFile: async (path) => {
      const content = disk.get(path);
      if (content === undefined) throw new Error(`ENOENT ${path}`);
      return content;
    },
    writeFile: async (path, content) => {
      writes.push(path);
      disk.set(path, content);
    },
    readLibrary: async () => library,
    writeLibrary: async (json) => {
      library = json;
    },
  };
  return { fs, disk, writes, library: () => library };
}

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
  ['FsStore', () => new FsStore(memoryFs().fs)],
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

describe('FsStore : vrais fichiers', () => {
  const PATH = '/Users/moi/archi.drawio';

  it('isFilePath : chemins POSIX et Windows', () => {
    expect(isFilePath(PATH)).toBe(true);
    expect(isFilePath('C:\\docs\\a.drawio')).toBe(true);
    expect(isFilePath('demo:fixtures/a.drawio')).toBe(false);
  });

  it('le contenu vit sur le disque, pas dans la bibliothèque', async () => {
    const { fs, disk, library } = memoryFs({ [PATH]: '<mxfile v="1"/>' });
    const store = new FsStore(fs);
    await store.put(file(PATH, 10, { content: '<mxfile v="1"/>', cameraByPage: { p1: camera } }));
    expect(library()).not.toContain('mxfile');
    disk.set(PATH, '<mxfile v="2"/>'); // modifié dans draw.io
    expect(await store.get(PATH)).toMatchObject({ content: '<mxfile v="2"/>', cameraByPage: { p1: camera } });
  });

  it('ouvrir ne réécrit pas le fichier ; sauvegarder l’écrit', async () => {
    const { fs, disk, writes } = memoryFs({ [PATH]: '<a/>' });
    const store = new FsStore(fs);
    await store.put(file(PATH, 10, { content: '<a/>' }));
    expect(writes).toEqual([]);
    await store.updateMeta(PATH, { lastOpenedAt: 20 });
    expect(writes).toEqual([]);
    await store.updateMeta(PATH, { content: '<b/>', size: 4 });
    expect(disk.get(PATH)).toBe('<b/>');
  });

  it('fichier disparu : absent, mais toujours listé ; retirer ne supprime pas le fichier', async () => {
    const { fs, disk } = memoryFs({ [PATH]: '<a/>' });
    const store = new FsStore(fs);
    await store.put(file(PATH, 10, { content: '<a/>' }));
    disk.delete(PATH);
    expect(await store.get(PATH)).toBeUndefined();
    expect((await store.listRecent()).map((f) => f.id)).toEqual([PATH]);
    disk.set(PATH, '<a/>');
    await store.remove(PATH);
    expect(disk.has(PATH)).toBe(true);
    expect(await store.listRecent()).toEqual([]);
  });

  it('bibliothèque relue par une nouvelle instance (redémarrage de l’appli)', async () => {
    const mem = memoryFs({ [PATH]: '<a/>' });
    await new FsStore(mem.fs).put(file(PATH, 10, { content: '<a/>', lastPageId: 'p2' }));
    expect(await new FsStore(mem.fs).get(PATH)).toMatchObject({ id: PATH, lastPageId: 'p2', content: '<a/>' });
  });

  it('écritures de la bibliothèque dans l’ordre (pas de mise à jour perdue)', async () => {
    const mem = memoryFs();
    const store = new FsStore(mem.fs);
    await store.put(file('a', 1));
    await Promise.all([store.updateMeta('a', { lastPageId: 'x' }), store.updateMeta('a', { lastOpenedAt: 99 })]);
    expect(await new FsStore(mem.fs).get('a')).toMatchObject({ lastPageId: 'x', lastOpenedAt: 99 });
  });
});
