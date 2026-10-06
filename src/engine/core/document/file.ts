import { collectUnsupported } from '../../diagnostics/unsupportedStyles';
import type { UnsupportedReport } from '../../diagnostics/unsupportedStyles';
import { documentFromTree, readDrawio } from '../../format/parse';
import { readPageViews, writePageViews } from '../../format/viewState';
import type { PageViewState } from '../../format/viewState';
import { writeDrawio } from '../../format/write';
import type { DrawioTree } from '../../format/xmlTree';
import { pageGeometry } from '../../edit/anchoring/auto/distribute';
import type { PageGeometry } from '../../edit/anchoring/auto/distribute';
import { normalizeCameraState } from '../../interaction/camera';
import { GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { PickedElement } from '../../interaction/pick';
import type { DocumentModel } from '../../model/types';
import type { InitialView } from '../types';
import type { EngineCore } from '../EngineCore';

/**
 * Document chargé : arbre XML d'origine (écrit en place, SPEC §14.2), modèle relu de l'arbre, chargement et
 * sérialisation.
 */
export class DocumentFile {
  document: DocumentModel | undefined;
  /** Géométrie des pages au dernier état enregistré (avant les modifications en direct d'un glisser). */
  geometry = new Map<string, PageGeometry>();
  /** Arbre XML d'origine du document chargé, base de l'écriture in situ (SPEC §14.2). */
  xmlTree: DrawioTree | undefined;
  unsupportedReport: UnsupportedReport | undefined;
  fileId: string | undefined;

  constructor(private readonly core: EngineCore) {}

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const { document, tree } = readDrawio(xml);
    this.document = this.core.pageModes.withModeWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.xmlTree = tree;
    this.fileId = fileId;
    this.unsupportedReport = collectUnsupported(document, this.core.registry);
    this.core.transitions.active?.abort();
    this.core.selection.clearSelection();
    this.core.scenes.clear();
    this.core.pages.currentPageId = undefined;
    this.core.graph.invalidate();
    this.core.pages.lastDocumentPageId = undefined;
    this.core.gesture.drag = undefined;
    this.core.edits.undoStack.clear();
    this.core.pageModes.modeCurrents.clear();
    this.core.edits.syncModified();
    this.core.history.stack.replace(initialView?.history ?? []);
    this.core.links.linkUsage = { ...initialView?.linkUsage };
    // Vues enregistrées dans le fichier, remplacées par celles mémorisées localement (plus récentes).
    const fileViews = readPageViews(tree);
    this.core.pages.pageIso = new Map(
      [...fileViews].flatMap(([id, view]) => (view.iso ? [[id, view.iso] as const] : [])),
    );
    this.core.pages.pageCameras = new Map([...fileViews].map(([id, view]) => [id, normalizeCameraState(view.camera)]));
    for (const [id, camera] of Object.entries(initialView?.cameraByPage ?? {})) {
      this.core.pages.pageCameras.set(id, normalizeCameraState(camera));
    }
    if (initialView?.pageId && initialView.camera) {
      this.core.pages.pageCameras.set(initialView.pageId, normalizeCameraState(initialView.camera));
    }
    this.core.events.emit('load', document, fileId);
    const page = (initialView?.pageId && this.core.pages.pageById(initialView.pageId)) || document.pages[0];
    if (!page) {
      this.core.scenes.hideAll();
      this.core.rendering.requestRender();
      return;
    }
    this.core.pages.goToPage(page.id);
  }

  getDocument(): DocumentModel | undefined {
    return this.document;
  }

  getXmlTree(): DrawioTree | undefined {
    return this.xmlTree;
  }

  serialize(): string | undefined {
    if (!this.xmlTree) return undefined;
    this.core.gesture.endMove();
    if (this.core.pages.currentPageId)
      this.core.pages.pageIso.set(this.core.pages.currentPageId, this.core.viewModes.isoParams());
    const views = new Map<string, PageViewState>();
    for (const [id, camera] of this.core.pages.pageCameras) {
      if (id === GRAPH_PAGE_ID) continue;
      const iso = this.core.pages.pageIso.get(id);
      views.set(id, iso ? { camera, iso } : { camera });
    }
    writePageViews(this.xmlTree, views);
    const xml = writeDrawio(this.xmlTree);
    this.core.edits.undoStack.markSaved();
    this.core.edits.syncModified();
    return xml;
  }

  /** Arbre XML d'une page du document (même rang que dans le modèle). */
  pageTreeOf(pageId: string) {
    const index = this.document?.pages.findIndex((p) => p.id === pageId) ?? -1;
    return index >= 0 ? this.xmlTree?.pages[index] : undefined;
  }

  /**
   * L'arbre a changé de structure : le modèle est relu de l'arbre, les scènes des pages touchées et
   * de la vue graphe sont reconstruites, la sélection est reprise par id.
   */
  documentChanged(changedPageIds: string[], options: { distribute?: boolean } = {}): void {
    if (!this.xmlTree) return;
    const selected = this.core.selection.current;
    this.core.selection.clearSelection();
    let document = documentFromTree(this.xmlTree);
    if (options.distribute !== false && this.core.arrangement.distributeAfterEdit(document, changedPageIds))
      document = documentFromTree(this.xmlTree);
    this.document = this.core.pageModes.withModeWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.unsupportedReport = collectUnsupported(this.document, this.core.registry);
    this.core.graph.invalidate();
    for (const id of [...changedPageIds, GRAPH_PAGE_ID]) this.core.scenes.invalidate(id, true);
    const current = this.core.pages.getCurrentPage();
    if (current) {
      this.core.scenes.show(current);
      this.core.levels.applyHeightScale();
      this.core.labelEditor.hideEditedLabel();
    }
    if (selected && selected.pageId === current?.id) {
      const items: PickedElement[] = [];
      for (const { element } of selected.items) {
        const shape = current.shapes.find((s) => s.id === element.id);
        const edge = current.edges.find((e) => e.id === element.id);
        if (shape) items.push({ type: 'shape', element: shape });
        else if (edge) items.push({ type: 'edge', element: edge });
      }
      if (items.length > 0) this.core.selection.selectItems(items);
    }
    this.core.rendering.syncBackground();
    this.core.minimap.invalidate();
    this.core.edits.syncModified();
    this.core.events.emit('documentChange', this.document);
    this.core.rendering.requestRender();
  }

  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.unsupportedReport;
  }

  getFileId(): string | undefined {
    return this.fileId;
  }
}
