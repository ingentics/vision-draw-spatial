import { addPage, removePage, renamePage } from '../../format/create';
import type { IsoViewParams } from '../../format/viewState';
import type { CameraState } from '../../interaction/camera';
import { GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { PageModel, Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';

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
    return this.core.editable && this.core.file.xmlTree?.xml.documentElement?.tagName === 'mxfile';
  }

  addPage(name?: string): string | undefined {
    if (!this.core.file.xmlTree || !this.core.file.document || !this.canEditPages() || this.core.transitions.active)
      return undefined;
    const names = new Set(this.core.file.document.pages.map((p) => p.name));
    let pageName = name?.trim();
    for (let n = this.core.file.document.pages.length + 1; !pageName || names.has(pageName); n++)
      pageName = `Page-${n}`;
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
      this.core.transitions.active
    )
      return;
    const index = document.pages.findIndex((p) => p.id === pageId);
    if (index < 0) return;
    const wasCurrent = this.currentPageId === pageId || this.core.graph.isGraphView();
    this.core.endMove();
    this.core.edits.recordEdit('Page supprimée');
    removePage(this.core.file.xmlTree, pageId);
    this.core.scenes.invalidate(pageId, true);
    this.pageCameras.delete(pageId);
    this.pageIso.delete(pageId);
    if (this.lastDocumentPageId === pageId) this.lastDocumentPageId = undefined;
    const entries = this.core.history.stack.entries();
    const kept = entries.filter((e) => e.pageId !== pageId && e.targetPageId !== pageId);
    if (kept.length !== entries.length) {
      this.core.history.stack.replace(kept);
      this.core.events.emit('historyChange', kept);
    }
    if (this.currentPageId === pageId) this.currentPageId = undefined;
    this.core.file.documentChanged([]);
    if (wasCurrent && !this.core.graph.isGraphView()) {
      const next = this.core.file.document!.pages[Math.min(index, this.core.file.document!.pages.length - 1)];
      if (next) this.goToPage(next.id);
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
    this.core.transitions.active?.abort();
    cancelAnimationFrame(this.core.camera.animation);
    this.core.camera.animation = 0;
    this.core.endMove();
    if (this.currentPageId !== page.id) this.core.selection.clearSelection();
    this.core.viewModes.applyPageIso(page.id);
    this.currentPageId = page.id;
    if (page.id !== GRAPH_PAGE_ID) this.lastDocumentPageId = page.id;
    this.core.scenes.show(page);
    this.core.levels.applyHeightScale();
    this.core.rendering.syncBackground();
    this.core.minimap.invalidate();
    const camera = this.pageCameras.get(page.id);
    if (camera) this.core.camera.setCameraState(camera);
    else this.core.camera.fitToBounds(isEmptyPage(page) ? EMPTY_PAGE_AREA : page.bounds);
    this.core.rendering.requestRender();
    this.core.links.updateLinkZones();
    this.core.events.emit('pageChange', page);
  }

  /** Page du document, ou la page générée de la vue graphe. */
  pageById(id: string): PageModel | undefined {
    if (id === GRAPH_PAGE_ID) return this.core.graph.getGraphPage();
    return this.core.file.document?.pages.find((p) => p.id === id);
  }
}
