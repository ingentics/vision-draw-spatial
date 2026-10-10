/** Nom d'un fichier sans dossier ni extension, base des noms téléchargés (`fixtures/a.drawio` → `a`). */
export function baseName(path: string): string {
  return path
    .split('/')
    .pop()!
    .replace(/\.[^.]+$/, '');
}

/** Propose un fichier au téléchargement sous `name` (fichier, rapport des Diagnostics, image exportée). */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
