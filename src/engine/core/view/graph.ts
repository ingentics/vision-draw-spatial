import { fitBounds } from '../../interaction/camera';
import { buildGraphPage, cardId, GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { GraphLayout } from '../../graph/graphPage';
import type { PageModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/**
 * Vue graphe du document (SPEC §12) : page générée (cartes des pages, flèches des liens), aller-retour avec la dernière
 * page.
 */
export class GraphView {
  /** Vue graphe du document (SPEC §12), construite à la première demande. */
  private cache: { page: PageModel; layout: GraphLayout } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Disposition de la vue graphe, si elle est construite. */
  get layout(): GraphLayout | undefined {
    return this.cache?.layout;
  }

  /** Document ou paramètres changés : la vue graphe sera reconstruite à la prochaine demande. */
  invalidate(): void {
    this.cache = undefined;
  }

  /**
   * Une page du document a changé : la vue graphe et ses scènes (miniatures) sont à reconstruire ; `includeCurrent` :
   * la scène affichée aussi (voir `SceneManager.invalidate`).
   */
  invalidateWithScenes(includeCurrent = false): void {
    this.invalidate();
    this.core.scenes.invalidate(GRAPH_PAGE_ID, includeCurrent);
  }

  /** Vrai pour la page générée de la vue graphe (pas une page du document). */
  isGraph(pageId: string | undefined): boolean {
    return pageId === GRAPH_PAGE_ID;
  }

  getGraphPage(): PageModel | undefined {
    if (!this.core.file.document) return undefined;
    const graph = this.core.settings.graph;
    this.cache ??= buildGraphPage(this.core.file.document, graph, {
      card: graph.cardColor,
      start: this.core.settings.selection.accentColor,
      orphan: graph.orphanColor,
      unreachable: graph.unreachableColor,
      arc: graph.arcColor,
      title: graph.titleColor,
    });
    return this.cache.page;
  }

  isGraphView(): boolean {
    return this.isGraph(this.core.pages.currentPageId);
  }

  showGraph(): void {
    const graph = this.getGraphPage();
    const page = this.core.pages.getCurrentPage();
    if (!graph || !page || this.isGraph(page.id) || !this.core.canInteract()) return;
    const card = graph.shapes.find((s) => s.id === cardId(page.id));
    this.core.transitions.runTransition({
      direction: 'out',
      outer: graph,
      inner: page,
      frame: card?.bounds,
      destination:
        this.core.pages.pageCameras.get(GRAPH_PAGE_ID) ??
        fitBounds(graph.bounds, this.core.display.viewport, {
          ...this.core.viewModes.arrivalOrientation(),
          limits: this.core.camera.limits,
        }),
    });
  }

  toggleGraph(): void {
    if (!this.isGraphView()) {
      this.showGraph();
      return;
    }
    const target = this.core.pages.lastDocumentPageId ?? this.core.file.document?.pages[0]?.id;
    if (target) this.core.links.followLink(cardId(target));
  }
}
