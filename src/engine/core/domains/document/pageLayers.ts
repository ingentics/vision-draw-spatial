import { creationLayerId, currentLayerId, layerCounts, newLayerName } from '../../edit/layerChoice';
import {
  addLayer,
  moveCellsToLayer,
  moveLayer,
  removeLayer,
  renameLayer,
  setLayerElevation,
  setLayerLocked,
  setLayerVisible,
} from '../../format/layerEdits';
import { writeDrawio } from '../../format/write';
import type { PageTree } from '../../format/xmlTree';
import { byId } from '../../model/pageIndex';
import type { LayerModel, PageModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/** Calques d'une page tels que l'appli les montre (sujet 523). */
export interface PageLayersView {
  /** Calques dans l'ordre de rendu : le dernier est au-dessus. */
  layers: readonly LayerModel[];
  /** Calque courant : là où vont les créations. */
  current: string;
  /** Calques aplatis (sujet 526) : élévations ramenées à 0 à l'affichage, sans rien écrire. */
  flattened: boolean;
  /** Nombre d'éléments posés directement sur chaque calque, par id ; absent : aucun. */
  counts: Readonly<Record<string, number>>;
}

/**
 * Calques des pages (sujet 523) : calque courant de chaque page (état de session, jamais écrit) et opérations sur les
 * calques, une étape d'annulation chacune. Une page n'a de calques que sans mode ou si son mode les active
 * (`page.layers`) ; ailleurs tout va sur le premier calque.
 */
export class PageLayers {
  /** Calque courant choisi sur chaque page. */
  private readonly currents = new Map<string, string>();

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : calques courants oubliés. */
  resetDocument(): void {
    this.currents.clear();
  }

  /** Calques de la page pour l'appli ; undefined si elle n'en a pas (mode sans calques, vue graphe). */
  view(pageId: string): PageLayersView | undefined {
    const page = this.layeredPage(pageId);
    const current = page && currentLayerId(page.layers, this.currents.get(pageId));
    return page && current !== undefined
      ? {
          layers: page.layers,
          current,
          flattened: this.core.layerSpreads.layersFlattened(pageId),
          counts: layerCounts(page),
        }
      : undefined;
  }

  /** Calque où écrire une création sur la page ; undefined : le premier (page sans calques). */
  creationLayer(page: PageModel): string | undefined {
    if (!this.core.modes.hasLayers(page)) return undefined;
    return creationLayerId(page.layers, currentLayerId(page.layers, this.currents.get(page.id)));
  }

  setCurrent(pageId: string, layerId: string): void {
    const view = this.view(pageId);
    if (!view || view.current === layerId || !view.layers.some((layer) => layer.id === layerId)) return;
    this.currents.set(pageId, layerId);
    this.core.layerDecor.redecorate(pageId);
    this.core.events.emit('layerChange', pageId);
  }

  /** Ajoute un calque au-dessus de tous, qui devient courant. */
  addLayer(pageId: string): void {
    this.edit(pageId, 'Nouveau calque', (pageTree, page) => {
      const id = addLayer(pageTree, newLayerName(page.layers));
      this.currents.set(pageId, id);
      return true;
    });
  }

  renameLayer(pageId: string, layerId: string, name: string): void {
    const trimmed = name.trim();
    this.editLayer(pageId, layerId, 'Calque renommé', (pageTree, page) => {
      if (!trimmed || byId(page.layers, layerId)?.name === trimmed) return false;
      renameLayer(pageTree, layerId, trimmed);
      return true;
    });
  }

  /** Monte (vers le dessus) ou descend un calque d'un rang, avec son contenu. */
  moveLayer(pageId: string, layerId: string, direction: 'up' | 'down'): void {
    this.editLayer(pageId, layerId, direction === 'up' ? 'Calque monté' : 'Calque descendu', (pageTree) =>
      moveLayer(pageTree, layerId, direction),
    );
  }

  /** Supprime un calque et son contenu ; jamais le dernier de la page. */
  removeLayer(pageId: string, layerId: string): void {
    this.editLayer(pageId, layerId, 'Calque supprimé', (pageTree) => removeLayer(pageTree, layerId), true);
  }

  setLayerVisible(pageId: string, layerId: string, visible: boolean): void {
    this.editLayer(pageId, layerId, visible ? 'Calque affiché' : 'Calque masqué', (pageTree, page) => {
      if (byId(page.layers, layerId)?.visible === visible) return false;
      setLayerVisible(pageTree, layerId, visible);
      return true;
    });
  }

  setLayerLocked(pageId: string, layerId: string, locked: boolean): void {
    this.editLayer(pageId, layerId, locked ? 'Calque verrouillé' : 'Calque déverrouillé', (pageTree, page) => {
      if (byId(page.layers, layerId)?.locked === locked) return false;
      setLayerLocked(pageTree, layerId, locked);
      return true;
    });
  }

  /** Élévation du calque en iso et en 3D (sujet 524) ; 0 la retire. */
  setLayerElevation(pageId: string, layerId: string, elevation: number): void {
    const value = Math.max(0, elevation);
    this.editLayer(pageId, layerId, 'Élévation du calque', (pageTree, page) => {
      if (byId(page.layers, layerId)?.elevation === value) return false;
      setLayerElevation(pageTree, layerId, value);
      return true;
    });
  }

  /** Passe la sélection (éléments posés sur un calque, avec leur contenu) sur le calque `layerId`. */
  moveSelectionToLayer(layerId: string): void {
    const selection = this.core.selection.current;
    if (!selection) return;
    const ids = selection.items.map((item) => item.element.id);
    this.editLayer(
      selection.pageId,
      layerId,
      'Changement de calque',
      (pageTree) => moveCellsToLayer(pageTree, ids, layerId).length > 0,
    );
  }

  /** Opération sur le calque `layerId` : sans effet s'il n'est pas sur la page (id venu de l'hôte). */
  private editLayer(
    pageId: string,
    layerId: string,
    label: string,
    write: (pageTree: PageTree, page: PageModel) => boolean,
    removes = false,
  ): void {
    this.edit(
      pageId,
      label,
      (pageTree, page) => byId(page.layers, layerId) !== undefined && write(pageTree, page),
      removes,
    );
  }

  /**
   * Opération sur les calques de la page `pageId`, si elle en a (ni mode sans calques, ni vue graphe) et qu'on peut
   * l'écrire : `write` renvoie faux s'il n'y
   * a rien à faire (aucune étape d'annulation). `removes` : le mode de la page remet ses données en ordre après les
   * éléments partis, dans la même étape.
   */
  private edit(
    pageId: string,
    label: string,
    write: (pageTree: PageTree, page: PageModel) => boolean,
    removes = false,
  ): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target || !this.layeredPage(pageId)) return;
    this.core.gesture.endMove();
    const before = writeDrawio(target.xmlTree);
    if (!write(target.pageTree, target.page)) return;
    this.core.edits.recordSnapshot(label, before);
    if (removes) this.core.modeFollowUps.elementsRemoved(pageId);
    this.core.file.documentChanged([pageId], { distribute: removes });
  }

  private layeredPage(pageId: string): PageModel | undefined {
    const page = this.core.pages.pageById(pageId);
    return page && !this.core.graph.isGraph(pageId) && this.core.modes.hasLayers(page) ? page : undefined;
  }
}
