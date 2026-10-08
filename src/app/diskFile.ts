import type { DiskFile } from '../engine';

/**
 * Navigateur : fichiers du disque par l'API File System Access (Chrome, Edge). Un fichier ouvert par le
 * sélecteur ou glissé-déposé garde son accès et est réécrit à la sauvegarde (étape 354). Ailleurs (Firefox,
 * Safari), rien de tout ça : bibliothèque et téléchargement.
 */

/** Parties de l'API absentes des types DOM de TypeScript. */
type PermissionMode = { mode: 'readwrite' };
interface WritableHandle extends FileSystemFileHandle {
  queryPermission(options: PermissionMode): Promise<PermissionState>;
  requestPermission(options: PermissionMode): Promise<PermissionState>;
}
type OpenPicker = (options: {
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle[]>;

const READ_WRITE: PermissionMode = { mode: 'readwrite' };

const openPicker = (globalThis as { showOpenFilePicker?: OpenPicker }).showOpenFilePicker;

/** L'API est disponible (contexte sécurisé, navigateur Chromium). */
export const diskAccess = typeof openPicker === 'function';

/** Dialogue « Ouvrir » du navigateur ; undefined si l'utilisateur annule. */
export async function pickDiskFile(): Promise<{ file: File; disk: DiskFile } | undefined> {
  let handles: FileSystemFileHandle[];
  try {
    handles = await openPicker!({
      types: [{ description: 'Schéma draw.io', accept: { 'application/xml': ['.drawio', '.xml'] } }],
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return undefined;
    throw cause;
  }
  const handle = handles[0];
  if (!handle) return undefined;
  const file = await handle.getFile();
  return { file, disk: { handle, modifiedAt: file.lastModified } };
}

/**
 * Accès au fichier d'un glisser-déposer : à appeler pendant l'événement `drop` (la liste des éléments
 * n'est plus lisible ensuite).
 */
export function droppedDiskFile(event: DragEvent): Promise<DiskFile | undefined> {
  const item = event.dataTransfer?.items[0] as
    (DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> }) | undefined;
  if (!item?.getAsFileSystemHandle) return Promise.resolve(undefined);
  return item.getAsFileSystemHandle().then(
    async (handle) =>
      handle instanceof FileSystemFileHandle
        ? { handle, modifiedAt: (await handle.getFile()).lastModified }
        : undefined,
    () => undefined,
  );
}

/** L'écriture est autorisée sans rien demander. */
export async function canWrite(disk: DiskFile): Promise<boolean> {
  return (await (disk.handle as WritableHandle).queryPermission(READ_WRITE)) === 'granted';
}

/** Demande l'autorisation d'écrire (au cours d'un geste de l'utilisateur : clic, raccourci). */
export async function requestWrite(disk: DiskFile): Promise<boolean> {
  const handle = disk.handle as WritableHandle;
  if ((await handle.queryPermission(READ_WRITE)) === 'granted') return true;
  return (await handle.requestPermission(READ_WRITE)) === 'granted';
}

/** Le fichier a changé sur le disque depuis sa dernière lecture ou écriture par l'appli. */
export class DiskConflictError extends Error {
  constructor(name: string) {
    super(
      `« ${name} » a été modifié sur le disque depuis son ouverture ; rouvrez-le pour ne pas écraser ces changements`,
    );
  }
}

/** Réécrit le fichier (autorisation déjà accordée) ; renvoie sa nouvelle date de modification. */
export async function writeDiskFile(disk: DiskFile, content: string): Promise<number> {
  const current = await disk.handle.getFile();
  if (current.lastModified !== disk.modifiedAt) throw new DiskConflictError(disk.handle.name);
  const writable = await disk.handle.createWritable();
  await writable.write(content);
  await writable.close();
  return (await disk.handle.getFile()).lastModified;
}
