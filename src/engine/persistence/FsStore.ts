import { DEFAULT_RECENT_LIMIT, sortRecent } from './FileStore';
import type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './FileStore';

/**
 * Accès aux fichiers fourni par l'appli native (SPEC §5.2) : lecture / écriture de vrais fichiers,
 * et d'un fichier de bibliothèque (JSON) dans le dossier de l'application.
 */
export interface FileSystemAccess {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readLibrary(): Promise<string | undefined>;
  writeLibrary(json: string): Promise<void>;
}

/** Entrée de la bibliothèque : tout le StoredFile, sauf le contenu pour un vrai fichier (lu sur le disque). */
type LibraryEntry = Omit<StoredFile, 'content'> & { content?: string };

interface Library {
  version: 1;
  files: Record<string, LibraryEntry>;
}

/** Chemin absolu (POSIX ou Windows) : l'id désigne un vrai fichier. */
export function isFilePath(id: string): boolean {
  return id.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(id) || id.startsWith('\\\\');
}

/**
 * FileStore sur le système de fichiers (SPEC §5.2) : l'id d'un fichier est son chemin, son contenu
 * est lu et écrit sur le disque ; l'état de consultation (vue, historique…) est gardé dans la
 * bibliothèque. Les autres ids (exemples embarqués) gardent leur contenu dans la bibliothèque.
 * Retirer un fichier de la liste ne le supprime jamais du disque.
 */
export class FsStore implements FileStore {
  private library: Promise<Library> | undefined;
  /** Écritures de la bibliothèque, une à la fois et dans l'ordre. */
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly fs: FileSystemAccess) {}

  async listRecent(limit = DEFAULT_RECENT_LIMIT): Promise<StoredFileMeta[]> {
    const { files } = await this.load();
    return sortRecent(
      Object.values(files).map((entry) => ({ content: '', ...entry })),
      limit,
    );
  }

  async get(id: string): Promise<StoredFile | undefined> {
    const entry = (await this.load()).files[id];
    if (!entry) return undefined;
    if (!isFilePath(id))
      return entry.content === undefined ? undefined : structuredClone({ ...entry, content: entry.content });
    // Fichier déplacé ou supprimé hors de l'appli : absent (l'entrée reste, l'utilisateur la retire).
    const content = await this.fs.readFile(id).catch(() => undefined);
    return content === undefined ? undefined : { ...structuredClone(entry), content, size: content.length };
  }

  async put(file: StoredFile): Promise<void> {
    if (isFilePath(file.id)) {
      // Un fichier qu'on vient d'ouvrir n'est pas réécrit (sa date de modification ne change pas).
      const current = await this.fs.readFile(file.id).catch(() => undefined);
      if (current !== file.content) await this.fs.writeFile(file.id, file.content);
    }
    await this.update((library) => {
      library.files[file.id] = this.entry(structuredClone(file));
    });
  }

  async updateMeta(id: string, patch: StoredFilePatch): Promise<void> {
    if (patch.content !== undefined && isFilePath(id) && (await this.load()).files[id]) {
      await this.fs.writeFile(id, patch.content);
    }
    await this.update((library) => {
      const current = library.files[id];
      if (current) library.files[id] = this.entry({ ...current, ...structuredClone(patch), id });
    });
  }

  async remove(id: string): Promise<void> {
    await this.update((library) => {
      delete library.files[id];
    });
  }

  private entry(file: LibraryEntry): LibraryEntry {
    if (!isFilePath(file.id)) return file;
    const { content: _content, ...entry } = file;
    return entry;
  }

  private load(): Promise<Library> {
    this.library ??= this.fs.readLibrary().then((json) => {
      try {
        const parsed = JSON.parse(json ?? '') as Partial<Library>;
        if (parsed && typeof parsed.files === 'object' && parsed.files) return { version: 1, files: parsed.files };
      } catch {
        // Absente ou illisible : bibliothèque vide.
      }
      return { version: 1, files: {} };
    });
    return this.library;
  }

  private async update(change: (library: Library) => void): Promise<void> {
    const library = await this.load();
    change(library);
    const json = JSON.stringify(library, null, 2);
    const write = this.writing.then(() => this.fs.writeLibrary(json));
    this.writing = write.catch(() => undefined);
    await write;
  }
}
