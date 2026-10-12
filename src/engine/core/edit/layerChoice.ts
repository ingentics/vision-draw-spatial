import { firstFreeName } from '../model/names';
import type { LayerModel, PageModel } from '../model/types';

/**
 * Choix des calques d'une page (sujet 523) : calque courant, calque d'une création, nom d'un nouveau calque, nombre
 * d'éléments de chaque calque, élévation saisie.
 */

/** Calque courant : celui choisi s'il existe encore, sinon le premier (le principal). */
export function currentLayerId(layers: readonly LayerModel[], chosen: string | undefined): string | undefined {
  return layers.some((layer) => layer.id === chosen) ? chosen : layers[0]?.id;
}

/**
 * Calque où va une création : le courant s'il est visible et déverrouillé, sinon le plus haut qui l'est (on ne crée
 * pas ce qu'on ne verrait pas ou ne toucherait plus) ; à défaut, le courant.
 */
export function creationLayerId(layers: readonly LayerModel[], current: string | undefined): string | undefined {
  const open = (layer: LayerModel) => layer.visible && !layer.locked;
  const chosen = layers.find((layer) => layer.id === current);
  if (chosen && open(chosen)) return chosen.id;
  return [...layers].reverse().find(open)?.id ?? chosen?.id;
}

/** Nom d'un nouveau calque : « Calque N », N le premier entier libre à partir du nombre de calques plus un. */
export function newLayerName(layers: readonly LayerModel[]): string {
  return firstFreeName(
    'Calque ',
    layers.map((layer) => layer.name),
    layers.length + 1,
  );
}

/** Nombre d'éléments posés directement sur chaque calque (ni dans un conteneur ni sur une flèche), par id de calque. */
export function layerCounts(page: Pick<PageModel, 'shapes' | 'edges'>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const element of [...page.shapes, ...page.edges])
    if (element.parentId === undefined) counts[element.layerId] = (counts[element.layerId] ?? 0) + 1;
  return counts;
}

/**
 * Élévation saisie (sujet 524), en pixels : vide vaut 0, virgule décimale acceptée ; undefined si elle n'est pas un
 * nombre positif ou nul.
 */
export function readElevation(text: string): number | undefined {
  const trimmed = text.trim();
  const value = trimmed === '' ? 0 : Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
