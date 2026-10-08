import type { CameraState } from '../interaction/cameraMath';
import type { HistoryEntry, LinkUsage } from '../interaction/navigationHistory';

/**
 * Persistance des fichiers et de leur état de consultation (SPEC §5).
 * M1 : IndexedDB (contenu stocké). Plus tard : FsStore (Electron/Tauri, vrais chemins).
 */

export interface StoredFileMeta {
  id: string;
  name: string;
  lastOpenedAt: number;
  /** Taille du contenu, en caractères. */
  size: number;
  lastPageId?: string;
}

export interface StoredFile extends StoredFileMeta {
  /** XML draw.io brut. */
  content: string;
  cameraByPage: Record<string, CameraState>;
  /** Pile de navigation par liens (SPEC §11.3). */
  history?: HistoryEntry[];
  /** Dernière utilisation des liens entre pages (tri des pages parentes). */
  linkUsage?: LinkUsage;
  /** Navigateur : accès au fichier du disque d'où il a été ouvert (File System Access), réécrit à la sauvegarde. */
  disk?: DiskFile;
}

/** Fichier du disque ouvert dans le navigateur et date de sa dernière modification connue (garde-fou d'écrasement). */
export interface DiskFile {
  handle: FileSystemFileHandle;
  modifiedAt: number;
}

/** Ce qui peut être mis à jour sans réécrire le contenu. */
export type StoredFilePatch = Partial<Omit<StoredFile, 'id'>>;

export interface FileStore {
  /** Fichiers récents, le plus récemment ouvert en premier. */
  listRecent(limit?: number): Promise<StoredFileMeta[]>;
  get(id: string): Promise<StoredFile | undefined>;
  put(file: StoredFile): Promise<void>;
  updateMeta(id: string, patch: StoredFilePatch): Promise<void>;
  remove(id: string): Promise<void>;
}

export function toMeta(file: StoredFile): StoredFileMeta {
  const { id, name, lastOpenedAt, size, lastPageId } = file;
  return lastPageId === undefined ? { id, name, lastOpenedAt, size } : { id, name, lastOpenedAt, size, lastPageId };
}

export function sortRecent(files: StoredFile[], limit: number): StoredFileMeta[] {
  return [...files]
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, limit)
    .map(toMeta);
}

export const DEFAULT_RECENT_LIMIT = 20;
