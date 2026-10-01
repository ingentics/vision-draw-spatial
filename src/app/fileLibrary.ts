import { parseDrawio } from '../engine/format/parse';
import { createEmptyDrawio } from '../engine/format/skeleton';
import { IndexedDbStore } from '../engine/persistence/IndexedDbStore';
import { MemoryStore } from '../engine/persistence/MemoryStore';
import type { FileStore, StoredFile } from '../engine/persistence/FileStore';
import type { DemoFile } from './demoFiles';

/**
 * Bibliothèque de fichiers de l'appli (SPEC §5, §6) au-dessus du FileStore :
 * import d'un fichier du disque, nouveau fichier, exemples, ouverture.
 */

/** IndexedDB si disponible ; sinon mémoire (navigation privée stricte : rien n'est conservé). */
export const store: FileStore = typeof indexedDB !== 'undefined' ? new IndexedDbStore() : new MemoryStore();

const ALL = 10_000;

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Importe un fichier du disque. Il doit être lisible (sinon `DrawioParseError`).
 * Un fichier du même nom déjà connu est mis à jour (contenu), en gardant pages et vues mémorisées :
 * rouvrir `archi.drawio` après l'avoir modifié dans draw.io retrouve le même point de vue.
 */
export async function importFile(name: string, content: string): Promise<StoredFile> {
  parseDrawio(content);
  const now = Date.now();
  const existing = (await store.listRecent(ALL)).find((f) => f.name === name);
  if (existing) {
    await store.updateMeta(existing.id, { content, size: content.length, lastOpenedAt: now });
    return (await store.get(existing.id))!;
  }
  const file: StoredFile = { id: newId(), name, content, size: content.length, lastOpenedAt: now, cameraByPage: {} };
  await store.put(file);
  return file;
}

/** Nouveau fichier vide (SPEC §6), nommé « Sans titre », « Sans titre 2 »… */
export async function createNewFile(): Promise<StoredFile> {
  const names = new Set((await store.listRecent(ALL)).map((f) => f.name));
  let name = 'Sans titre.drawio';
  for (let i = 2; names.has(name); i++) name = `Sans titre ${i}.drawio`;
  const content = createEmptyDrawio();
  const file: StoredFile = {
    id: newId(),
    name,
    content,
    size: content.length,
    lastOpenedAt: Date.now(),
    cameraByPage: {},
  };
  await store.put(file);
  return file;
}

/** Exemple embarqué : stocké comme un fichier (vues mémorisées), contenu toujours à jour du bundle. */
export async function openDemo(demo: DemoFile): Promise<StoredFile> {
  const id = `demo:${demo.id}`;
  const now = Date.now();
  const existing = await store.get(id);
  if (existing) {
    await store.updateMeta(id, { content: demo.xml, size: demo.xml.length, lastOpenedAt: now });
    return { ...existing, content: demo.xml, size: demo.xml.length, lastOpenedAt: now };
  }
  const file: StoredFile = {
    id,
    name: demo.name,
    content: demo.xml,
    size: demo.xml.length,
    lastOpenedAt: now,
    cameraByPage: {},
  };
  await store.put(file);
  return file;
}

/** Rouvre un fichier récent (met à jour sa date d'ouverture). */
export async function openStored(id: string): Promise<StoredFile | undefined> {
  const file = await store.get(id);
  if (!file) return undefined;
  const now = Date.now();
  await store.updateMeta(id, { lastOpenedAt: now });
  return { ...file, lastOpenedAt: now };
}
