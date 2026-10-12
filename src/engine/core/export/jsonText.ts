import type { PageModel } from '../model/types';

/** Format JSON d'un export de mode (sujet 546) : l'appli montre le texte tel quel (fenêtre d'export commune). */
export const JSON_FORMAT = { id: 'json', name: 'JSON' } as const;

/** Export JSON d'une page : le modèle exporté de `model`, indenté de deux espaces, fin de ligne finale. */
export function jsonExporter<T>(model: (page: PageModel) => T) {
  return { ...JSON_FORMAT, export: (page: PageModel) => `${JSON.stringify(model(page), null, 2)}\n` };
}
