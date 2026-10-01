import type { CameraState } from '../engine/interaction/camera';
import type { HistoryEntry } from '../engine/interaction/history';

/**
 * Mémoire de l'onglet pour le développement : après un rechargement (hot reload du moteur),
 * on retrouve le même fichier, la même page et le même point de vue.
 * La vraie persistance (fichiers récents, IndexedDB) arrive à l'étape 6.
 */

const KEY = 'drawio-spatial:dev-session';

export interface DevSession {
  fileId: string;
  /** Contenu, seulement pour un fichier ouvert depuis le disque (les démos sont dans le bundle). */
  xml?: string;
  pageId?: string;
  /** Dernière caméra de chaque page visitée. */
  cameraByPage?: Record<string, CameraState>;
  /** Pile de navigation par liens. */
  history?: HistoryEntry[];
}

export function readDevSession(): DevSession | undefined {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DevSession) : undefined;
  } catch {
    return undefined;
  }
}

export function writeDevSession(session: DevSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Stockage plein ou indisponible : on perd seulement la restauration.
  }
}

/** Met à jour la session du fichier courant ; ignoré si un autre fichier a été ouvert entre-temps. */
export function patchDevSession(fileId: string, patch: Partial<DevSession>): void {
  const current = readDevSession();
  if (current?.fileId !== fileId) return;
  writeDevSession({ ...current, ...patch });
}
