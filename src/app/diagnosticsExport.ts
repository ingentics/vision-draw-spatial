import type { ParseWarning, UnsupportedReport } from '../engine';

/** Télécharge le rapport des Diagnostics du fichier courant en JSON (SPEC §8.4). */
export function exportJson(
  fileId: string | undefined,
  report: UnsupportedReport | undefined,
  warnings: ParseWarning[],
  appError: string | undefined,
): void {
  const data = {
    generatedAt: new Date().toISOString(),
    currentFile: fileId ? { fileId, ...report, warnings, appError } : undefined,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const base = (fileId ?? 'drawio-spatial')
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '');
  link.href = url;
  link.download = `${base}-diagnostics.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
