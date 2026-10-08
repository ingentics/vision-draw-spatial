import { fitBounds } from '../../interaction/cameraMath';
import { buildGraphPage, cardId, GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { GraphLayout } from '../../graph/graphPage';
import { miniGraph } from '../../graph/miniGraph';
import type { MiniGraph } from '../../graph/miniGraph';
import type { PageModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import { settingsSectionChanged } from '../../settings';
import type { Settings } from '../../settings';

/**
 * Vue graphe du document (SPEC §12) : page générée (nœuds des pages, flèches des liens), aller-retour avec la dernière
 * page.
 */
export class GraphView {
  /** Vue graphe du document (SPEC §12), construite à la première demande. */
  private cache: { page: PageModel; layout: GraphLayout } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Paramètres changés : la vue graphe suit ses réglages et la couleur d'accent (nœud de départ). */
  settingsChanged(settings: Settings, previous: Settings): void {
    if (
      settingsSectionChanged(settings, previous, 'graph') ||
      settings.selection.accentColor !== previous.selection.accentColor
    )
      this.invalidate();
  }

  /** Document ou paramètres changés : la vue graphe sera reconstruite à la prochaine demande. */
  invalidate(): void {
    this.cache = undefined;
  }

  /** Nouveau document : la vue graphe sera reconstruite. */
  resetDocument(): void {
    this.invalidate();
  }

  /**
   * Une page du document a changé (noms, liens) : la vue graphe et ses scènes sont à reconstruire ; `includeCurrent` :
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
    return this.built()?.page;
  }

  /** Mini-graphe (sujet 366) : la disposition de la vue graphe ramenée à un encart de largeur `size`. */
  getMiniGraph(size: number): MiniGraph | undefined {
    const layout = this.built()?.layout;
    return layout && miniGraph(layout, size);
  }

  private built(): { page: PageModel; layout: GraphLayout } | undefined {
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
    return this.cache;
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
