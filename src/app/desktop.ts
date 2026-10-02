import type { FileSystemAccess } from '../engine/persistence/FsStore';

/**
 * Pont de l'appli native (Electron, `desktop/preload.cjs`) : absent dans le navigateur.
 * Ouverture et création passent par les dialogues du système, la sauvegarde écrit le vrai fichier.
 */
export interface DesktopBridge extends FileSystemAccess {
  platform: string;
  /** Dialogue « Ouvrir » : chemin et contenu du fichier choisi. */
  openDialog(): Promise<{ path: string; content: string } | undefined>;
  /** Dialogue « Enregistrer sous » : chemin choisi (autorisé en écriture). */
  saveDialog(defaultName: string): Promise<string | undefined>;
  /** Chemin d'un fichier glissé-déposé, autorisé en écriture ; undefined s'il ne vient pas du disque. */
  pathForFile(file: File): Promise<string | undefined>;
}

export const desktop: DesktopBridge | undefined = (globalThis as { drawioSpatialDesktop?: DesktopBridge })
  .drawioSpatialDesktop;

/** Nom de fichier d'un chemin (séparateurs POSIX ou Windows). */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
