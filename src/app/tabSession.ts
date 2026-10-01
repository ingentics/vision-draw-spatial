/**
 * Fichier ouvert dans cet onglet : après un rechargement (hot reload du moteur), on le rouvre
 * directement au lieu de repasser par le lanceur. Son état (page, vues…) vient du FileStore.
 */

const KEY = 'drawio-spatial:current-file';

export function getCurrentFileId(): string | undefined {
  try {
    return sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setCurrentFileId(id: string | undefined): void {
  try {
    if (id) sessionStorage.setItem(KEY, id);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Stockage de session indisponible : le rechargement ramènera au lanceur.
  }
}
