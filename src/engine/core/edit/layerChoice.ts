import { firstFreeName } from '../model/names';
import type { LayerModel } from '../model/types';

/** Choix des calques d'une page (sujet 523) : calque courant, calque d'une création, nom d'un nouveau calque. */

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
