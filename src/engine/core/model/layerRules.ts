import type { PageModel, ShapeModel } from './types';

/** Ce qu'un élément doit à son calque (sujet 523) : être dessiné, se laisser toucher. */
export interface LayerRules {
  /** Élément dessiné : visible, sur un calque visible. */
  shown(element: LayeredElement): boolean;
  /** Élément qu'on touche (clic, sélection, accroche d'une flèche) : dessiné, sur un calque déverrouillé. */
  touchable(element: LayeredElement): boolean;
}

export type LayeredElement = Pick<ShapeModel, 'visible' | 'layerId'>;

export function layerRules(page: Pick<PageModel, 'layers'>): LayerRules {
  const hidden = new Set(page.layers.filter((layer) => !layer.visible).map((layer) => layer.id));
  const locked = new Set(page.layers.filter((layer) => layer.locked).map((layer) => layer.id));
  const shown = (element: LayeredElement) => element.visible && !hidden.has(element.layerId);
  return { shown, touchable: (element) => shown(element) && !locked.has(element.layerId) };
}
