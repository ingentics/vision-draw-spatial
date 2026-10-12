import type { PageLayersView } from '../core/domains/document/pageLayers';
import type { EngineCore } from '../core/domains/EngineCore';

/** Calques des pages (sujets 523 à 526). */
export class LayersApi {
  constructor(private readonly core: EngineCore) {}

  /**
   * Calques d'une page (sujet 523) et son calque courant ; undefined si elle n'en a pas (page en mode sans calques,
   * vue graphe).
   */
  of(pageId: string): PageLayersView | undefined {
    return this.core.layers.view(pageId);
  }

  /** Calque courant d'une page : là où vont les formes déposées, les flèches tirées et les collages. */
  setCurrent(pageId: string, layerId: string): void {
    this.core.layers.setCurrent(pageId, layerId);
  }

  /** Ajoute un calque au-dessus de tous, qui devient courant. */
  add(pageId: string): void {
    this.core.layers.addLayer(pageId);
  }

  rename(pageId: string, layerId: string, name: string): void {
    this.core.layers.renameLayer(pageId, layerId, name);
  }

  /** Monte (vers le dessus) ou descend un calque d'un rang. */
  move(pageId: string, layerId: string, direction: 'up' | 'down'): void {
    this.core.layers.moveLayer(pageId, layerId, direction);
  }

  /** Supprime un calque et son contenu ; jamais le dernier de la page. */
  remove(pageId: string, layerId: string): void {
    this.core.layers.removeLayer(pageId, layerId);
  }

  setVisible(pageId: string, layerId: string, visible: boolean): void {
    this.core.layers.setLayerVisible(pageId, layerId, visible);
  }

  setLocked(pageId: string, layerId: string, locked: boolean): void {
    this.core.layers.setLayerLocked(pageId, layerId, locked);
  }

  /** Élévation d'un calque en iso et en 3D, en pixels (0 : au sol). */
  setElevation(pageId: string, layerId: string, elevation: number): void {
    this.core.layers.setLayerElevation(pageId, layerId, elevation);
  }

  /** Aplatit (élévations ramenées à 0, en animation) ou étend les calques d'une page, sans rien écrire. */
  setFlattened(pageId: string, flattened: boolean): void {
    this.core.layerSpreads.setLayersFlattened(pageId, flattened);
  }

  /** Passe la sélection sur un calque (éléments posés sur un calque, avec leur contenu). */
  moveSelection(layerId: string): void {
    this.core.layers.moveSelectionToLayer(layerId);
  }
}
