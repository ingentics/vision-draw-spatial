import type { ParseWarning, UnsupportedCategory, UnsupportedReport } from '../engine';

/**
 * Cumul des éléments non supportés sur tous les fichiers ouverts dans ce navigateur (SPEC §8.4) :
 * le backlog des formes à implémenter, priorisé par fréquence réelle. Chaque fichier compte
 * pour son dernier état connu (le rouvrir ne double pas ses occurrences).
 */

const KEY = 'drawio-spatial:unsupported-log';

interface FileCounts {
  name: string;
  updatedAt: number;
  counts: Record<string, { category: UnsupportedCategory; name: string; count: number }>;
}

interface StoredLog {
  files: Record<string, FileCounts>;
}

export interface CumulativeEntry {
  category: UnsupportedCategory;
  name: string;
  count: number;
  /** Nombre de fichiers où l'élément apparaît. */
  files: number;
}

function read(): StoredLog {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredLog) : undefined;
    return parsed?.files ? parsed : { files: {} };
  } catch {
    return { files: {} };
  }
}

function write(log: StoredLog): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // Stockage indisponible : le cumul se limite à la session.
  }
}

/** Met à jour la contribution d'un fichier (remplace la précédente). */
export function recordFile(fileId: string, fileName: string, report: UnsupportedReport): void {
  const log = read();
  const counts: FileCounts['counts'] = {};
  for (const entry of report.entries) {
    counts[`${entry.category}:${entry.name}`] = { category: entry.category, name: entry.name, count: entry.count };
  }
  log.files[fileId] = { name: fileName, updatedAt: Date.now(), counts };
  write(log);
}

export function cumulativeEntries(): { entries: CumulativeEntry[]; fileCount: number } {
  const log = read();
  const merged = new Map<string, CumulativeEntry>();
  for (const file of Object.values(log.files)) {
    for (const [key, { category, name, count }] of Object.entries(file.counts)) {
      const entry = merged.get(key) ?? { category, name, count: 0, files: 0 };
      entry.count += count;
      entry.files++;
      merged.set(key, entry);
    }
  }
  const entries = [...merged.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { entries, fileCount: Object.keys(log.files).length };
}

export function clearLog(): void {
  write({ files: {} });
}

/** Télécharge le rapport (fichier courant + cumul) en JSON. */
export function exportJson(
  fileId: string | undefined,
  report: UnsupportedReport | undefined,
  warnings: ParseWarning[],
): void {
  const cumulative = cumulativeEntries();
  const data = {
    generatedAt: new Date().toISOString(),
    currentFile: fileId ? { fileId, ...report, warnings } : undefined,
    cumulative: { fileCount: cumulative.fileCount, entries: cumulative.entries },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const base = (fileId ?? 'drawio-spatial')
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '');
  link.href = url;
  link.download = `${base}-non-supportes.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
