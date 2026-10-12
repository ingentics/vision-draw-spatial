import type { Anchoring, EdgeLine } from '../core/edit/anchoring/mode';
import type { CameraState } from '../core/interaction/cameraState';
import type { PageModel } from '../core/model/types';
import type { JumpDefaults } from '../core/render/edges/jumps';
import type { EngineCore } from '../core/domains/EngineCore';

/** Pages du document : ajout, nom, suppression, page affichée, réglages propres à une page. */
export class PagesApi {
  constructor(private readonly core: EngineCore) {}

  /** Pages modifiables : fichier `<mxfile>` (l'ancien format n'a qu'une page sans nom). */
  canEdit(): boolean {
    return this.core.pages.canEditPages();
  }

  /** Ajoute une page vide (« Page-n ») et l'affiche. */
  add(name?: string): string | undefined {
    return this.core.pages.addPage(name);
  }

  rename(pageId: string, name: string): void {
    this.core.pages.renamePage(pageId, name);
  }

  /** Retire une page (pas la dernière) ; si c'était la page affichée, on passe à sa voisine. */
  remove(pageId: string): void {
    this.core.pages.removePage(pageId);
  }

  current(): PageModel | undefined {
    return this.core.pages.getCurrentPage();
  }

  /** Dernière caméra de chaque page visitée (à persister, SPEC §5.1 `cameraByPage`). */
  cameras(): Record<string, CameraState> {
    return this.core.pages.getPageCameras();
  }

  /**
   * Affiche une page (SPEC §9.4) : sa scène est reprise du cache si elle a déjà été construite,
   * et sa caméra est celle de la dernière visite (sinon la page entière est cadrée).
   */
  goTo(pageId: string): void {
    this.core.pages.goToPage(pageId);
  }

  /**
   * Ancrage propre à une page (undefined : celui de l'appli). Passer une page en automatique y répartit toutes les
   * flèches, dans la même étape d'annulation.
   */
  setAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    this.core.arrangement.setPageAnchoring(pageId, anchoring);
  }

  /** Tracé propre à une page (undefined : celui de l'appli), pour les flèches qui y seront créées. */
  setEdgeLine(pageId: string, line: EdgeLine | undefined): void {
    this.core.arrangement.setPageEdgeLine(pageId, line);
  }

  /** Saut propre à une page (undefined : celui de l'appli), suivi par ses flèches sans `jumpStyle`. */
  setJumps(pageId: string, jumps: JumpDefaults['style'] | undefined): void {
    this.core.jumps.setPageJumps(pageId, jumps);
  }
}
