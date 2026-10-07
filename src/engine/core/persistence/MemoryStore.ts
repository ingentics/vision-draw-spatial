import { DEFAULT_RECENT_LIMIT, sortRecent } from './FileStore';
import type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './FileStore';

/** FileStore en mémoire : tests, ou navigateur sans IndexedDB (rien n'est conservé). */
export class MemoryStore implements FileStore {
  private readonly files = new Map<string, StoredFile>();

  async listRecent(limit = DEFAULT_RECENT_LIMIT): Promise<StoredFileMeta[]> {
    return sortRecent([...this.files.values()], limit);
  }

  async get(id: string): Promise<StoredFile | undefined> {
    const file = this.files.get(id);
    return file ? structuredClone(file) : undefined;
  }

  async put(file: StoredFile): Promise<void> {
    this.files.set(file.id, structuredClone(file));
  }

  async updateMeta(id: string, patch: StoredFilePatch): Promise<void> {
    const file = this.files.get(id);
    if (file) this.files.set(id, { ...file, ...structuredClone(patch), id });
  }

  async remove(id: string): Promise<void> {
    this.files.delete(id);
  }
}
