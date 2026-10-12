import type { MiniGraph } from '../core/graph/miniGraph';
import type { EngineCore } from '../core/domains/EngineCore';

/** Vue graphe et mini-graphe (SPEC §12). */
export class GraphApi {
  constructor(private readonly core: EngineCore) {}

  isShown(): boolean {
    return this.core.graph.isGraphView();
  }

  /**
   * Affiche la vue graphe. Depuis une page : la page rétrécit dans sa carte (transition inverse
   * d'un lien), puis on recule jusqu'à la vue d'ensemble du graphe (ou sa dernière vue).
   */
  show(): void {
    this.core.graph.showGraph();
  }

  /** Graphe ↔ dernière page affichée (en plongeant dans sa carte). */
  toggle(): void {
    this.core.graph.toggleGraph();
  }

  /**
   * Mini-graphe (sujet 366) : nœuds et liens de la vue graphe ramenés à un encart de largeur `size` (pixels CSS, la
   * hauteur suit les proportions du graphe). Undefined sans document.
   */
  miniGraph(size: number): MiniGraph | undefined {
    return this.core.graph.getMiniGraph(size);
  }
}
