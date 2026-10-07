import { addPage, removePage, renamePage } from '../../format/create';
import { readPageViews } from '../../format/viewState';
import type { IsoViewParams, PageViewState } from '../../format/viewState';
import { normalizeCameraState } from '../../interaction/cameraMath';
import type { CameraState } from '../../interaction/cameraMath';
import type { PageModel, Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import type { InitialView } from '../types';
import { firstFreeName } from '../../model/names';

/**
 * Cadrage d'une page vide : le haut de la feuille draw.io, pour que les formes ajoutées
 * tombent en coordonnées positives (sur la page, à l'ouverture dans draw.io).
 */
const EMPTY_PAGE_AREA: Rect = { x: 0, y: 0, width: 800, height: 600 };

function isEmptyPage(page: PageModel): boolean {
  return page.shapes.length === 0 && page.edges.length === 0;
}

/** Pages du document : page affichée, caméra et réglages iso de chaque page, ajout, renommage, suppression. */
export class Pages {
  currentPageId: string | undefined;
  /** Dernière caméra de chaque page visitée (SPEC §9.4). */
  pageCameras = new Map<string, CameraState>();
  /** Dernière page du document affichée (pour revenir du graphe). */
  lastDocumentPageId: string | undefined;
  /** Réglages iso de chaque page (lus du fichier, puis ceux en vigueur à la dernière visite). */
  pageIso = new Map<string, IsoViewParams>();

  constructor(private readonly core: EngineCore) {}

  canEditPages(): boolean {
    return this.core.targets.editable && this.core.file.xmlTree?.xml.documentElement?.tagName === 'mxfile';
  }

  addPage(name?: string): string | undefined {
    if (!this.core.file.xmlTree || !this.core.file.document || !this.canEditPages() || !this.core.canInteract())
      return undefined;
    const names = new Set(this.core.file.document.pages.map((p) => p.name));
    const asked = name?.trim();
    const pageName =
      asked && !names.has(asked) ? asked : firstFreeName('Page-', names, this.core.file.document.pages.length + 1);
    this.core.edits.recordEdit('Nouvelle page');
    const page = addPage(this.core.file.xmlTree, pageName);
    this.core.file.documentChanged([]);
    this.goToPage(page.id);
    return page.id;
  }

  renamePage(pageId: string, name: string): void {
    const trimmed = name.trim();
    const page = this.pageById(pageId);
    if (!this.core.file.xmlTree || !page || !trimmed || trimmed === page.name || !this.canEditPages()) return;
    this.core.edits.recordEdit('Page renommée');
    renamePage(this.core.file.xmlTree, pageId, trimmed);
    this.core.file.documentChanged([]);
  }

  removePage(pageId: string): void {
    const document = this.core.file.document;
    if (
      !this.core.file.xmlTree ||
      !document ||
      !this.canEditPages() ||
      document.pages.length <= 1 ||
      !this.core.canInteract()
    )
      return;
    const index = document.pages.findIndex((p) => p.id === pageId);
    if (index < 0) return;
    const wasCurrent = this.currentPageId === pageId || this.core.graph.isGraphView();
    this.core.gesture.endMove();
    this.core.edits.recordEdit('Page supprimée');
    removePage(this.core.file.xmlTree, pageId);
    this.core.scenes.invalidate(pageId, true);
    this.pageCameras.delete(pageId);
    this.pageIso.delete(pageId);
    if (this.lastDocumentPageId === pageId) this.lastDocumentPageId = undefined;
    this.core.history.forgetPage(pageId);
    if (this.currentPageId === pageId) this.currentPageId = undefined;
    this.core.file.documentChanged([]);
    if (wasCurrent && !this.core.graph.isGraphView()) {
      const next = this.core.file.document!.pages[Math.min(index, this.core.file.document!.pages.length - 1)];
      if (next) this.goToPage(next.id);
    }
  }

  /** Page courante, sans rien afficher (pendant une transition, la page extérieure ; `undefined` : aucune). */
  setCurrent(pageId: string | undefined): void {
    this.currentPageId = pageId;
  }

  /** Page affichée : courante, et dernière page du document vue si ce n'est pas la vue graphe. */
  arriveAt(pageId: string): void {
    this.currentPageId = pageId;
    if (!this.core.graph.isGraph(pageId)) this.lastDocumentPageId = pageId;
  }

  /** Dernière caméra d'une page, reprise à la prochaine visite. */
  rememberCamera(pageId: string, camera: CameraState): void {
    this.pageCameras.set(pageId, camera);
  }

  /** Réglages iso en vigueur, gardés pour la page courante. */
  rememberIso(): void {
    if (this.currentPageId) this.pageIso.set(this.currentPageId, this.core.viewModes.isoParams());
  }

  /** Vues de chaque page visitée (caméra, réglages iso), à écrire dans le fichier (vue graphe exclue). */
  savedViews(): Map<string, PageViewState> {
    this.rememberIso();
    const views = new Map<string, PageViewState>();
    for (const [id, camera] of this.pageCameras) {
      if (this.core.graph.isGraph(id)) continue;
      const iso = this.pageIso.get(id);
      views.set(id, iso ? { camera, iso } : { camera });
    }
    return views;
  }

  /**
   * Nouveau document : aucune page courante ; vues de chaque page lues dans le fichier, remplacées par celles
   * mémorisées localement (plus récentes).
   */
  resetDocument(initialView: InitialView | undefined): void {
    this.currentPageId = undefined;
    this.lastDocumentPageId = undefined;
    const fileViews = this.core.file.xmlTree ? readPageViews(this.core.file.xmlTree) : new Map<string, PageViewState>();
    const { limits } = this.core.camera;
    this.pageIso = new Map([...fileViews].flatMap(([id, view]) => (view.iso ? [[id, view.iso] as const] : [])));
    this.pageCameras = new Map([...fileViews].map(([id, view]) => [id, normalizeCameraState(view.camera, limits)]));
    for (const [id, camera] of Object.entries(initialView?.cameraByPage ?? {})) {
      this.pageCameras.set(id, normalizeCameraState(camera, limits));
    }
    if (initialView?.pageId && initialView.camera) {
      this.pageCameras.set(initialView.pageId, normalizeCameraState(initialView.camera, limits));
    }
  }

  getCurrentPage(): PageModel | undefined {
    return this.currentPageId ? this.pageById(this.currentPageId) : undefined;
  }

  getPageCameras(): Record<string, CameraState> {
    return structuredClone(Object.fromEntries(this.pageCameras));
  }

  goToPage(pageId: string): void {
    const page = this.pageById(pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    this.core.transitions.abort();
    this.core.camera.cancelAnimation();
    this.core.gesture.endMove();
    if (this.currentPageId !== page.id) this.core.selection.clearSelection();
    this.core.viewModes.applyPageIso(page.id);
    this.arriveAt(page.id);
    this.core.scenes.show(page);
    this.core.levels.applyHeightScale();
    this.core.rendering.syncBackground();
    this.core.minimap.invalidate();
    const camera = this.pageCameras.get(page.id);
    if (camera) this.core.camera.setCameraState(camera);
    else
      this.core.camera.fitToBounds(
        isEmptyPage(page) ? EMPTY_PAGE_AREA : page.bounds,
        this.core.viewModes.arrivalOrientation(),
      );
    this.core.rendering.requestRender();
    this.core.links.updateLinkZones();
    this.core.events.emit('pageChange', page);
  }

  /** Page du document, ou la page générée de la vue graphe. */
  pageById(id: string): PageModel | undefined {
    if (this.core.graph.isGraph(id)) return this.core.graph.getGraphPage();
    return this.core.file.document?.pages.find((p) => p.id === id);
  }
}
