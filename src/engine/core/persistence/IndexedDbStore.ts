import { DEFAULT_RECENT_LIMIT, sortRecent } from './FileStore';
import type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './FileStore';

const DB_VERSION = 1;
const FILES = 'files';

/**
 * FileStore IndexedDB (SPEC §5.2) : le contenu du fichier choisi par l'utilisateur est stocké
 * avec ses métadonnées. Un fichier draw.io reste petit : tout tient dans un seul magasin.
 */
export class IndexedDbStore implements FileStore {
  private database: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly name = 'drawio-spatial',
    private readonly factory: IDBFactory = indexedDB,
  ) {}

  async listRecent(limit = DEFAULT_RECENT_LIMIT): Promise<StoredFileMeta[]> {
    const files = await this.request<StoredFile[]>('readonly', (store) => store.getAll());
    return sortRecent(files, limit);
  }

  async get(id: string): Promise<StoredFile | undefined> {
    return this.request<StoredFile | undefined>('readonly', (store) => store.get(id));
  }

  async put(file: StoredFile): Promise<void> {
    await this.request('readwrite', (store) => store.put(file));
  }

  /** Lecture et écriture dans la même transaction : pas de mise à jour perdue entre deux appels. */
  async updateMeta(id: string, patch: StoredFilePatch): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FILES, 'readwrite');
      const store = tx.objectStore(FILES);
      const read = store.get(id);
      read.onsuccess = () => {
        const current = read.result as StoredFile | undefined;
        if (current) store.put({ ...current, ...patch, id });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async remove(id: string): Promise<void> {
    await this.request('readwrite', (store) => store.delete(id));
  }

  /** Ferme la base (tests, changement de compte…). */
  async close(): Promise<void> {
    const db = await this.database;
    db?.close();
    this.database = undefined;
  }

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise((resolve, reject) => {
      const request = this.factory.open(this.name, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.database;
  }

  private async request<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(FILES, mode);
      const request = run(tx.objectStore(FILES));
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
