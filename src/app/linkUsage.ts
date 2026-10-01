import { usageKey } from '../engine/interaction/history';
import type { LinkUsage } from '../engine/interaction/history';

/**
 * Usage des liens par fichier (SPEC §11.3), pour trier les pages parentes.
 * Stocké dans le navigateur en attendant le FileStore de l'étape 6.
 */

const KEY = 'drawio-spatial:link-usage';

function readAll(): Record<string, LinkUsage> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, LinkUsage>) : {};
  } catch {
    return {};
  }
}

export function readLinkUsage(fileId: string): LinkUsage {
  return readAll()[fileId] ?? {};
}

export function recordLinkUsage(fileId: string, fromPageId: string, toPageId: string, at: number): void {
  const all = readAll();
  all[fileId] = { ...all[fileId], [usageKey(fromPageId, toPageId)]: at };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Stockage indisponible : l'ordre des parents se limite à la session.
  }
}
