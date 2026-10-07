import { collectUnsupported } from '../../diagnostics/unsupportedStyles';
import type { UnsupportedReport } from '../../diagnostics/unsupportedStyles';
import { documentFromTree, readDrawio } from '../../format/parse';
import { writePageViews } from '../../format/viewState';
import { writeDrawio } from '../../format/write';
import type { DrawioTree } from '../../format/xmlTree';
import { pageGeometry } from '../../model/pageGeometry';
import type { PageGeometry } from '../../model/pageGeometry';
import type { PickedElement } from '../../interaction/pick';
import type { DocumentModel, PageModel } from '../../model/types';
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
    this.replaceDocument(document, tree);
    this.fileId = fileId;
    this.core.resetDocumentState(initialView);
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
    writePageViews(this.xmlTree, this.core.pages.savedViews());
    const xml = writeDrawio(this.xmlTree);
    this.core.edits.markSaved();
    return xml;
  }

  /** Document lu (chargement, annuler / rétablir) : modèle, géométrie des pages, arbre XML, styles non pris en charge. */
  replaceDocument(document: DocumentModel, tree: DrawioTree): void {
    this.document = this.core.pageModes.withModeWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.xmlTree = tree;
    this.unsupportedReport = collectUnsupported(document, this.core.registry);
  }

  /** Page écrite après un glisser : sa géométrie enregistrée suit. */
  updateGeometry(page: PageModel): void {
    this.geometry.set(page.id, pageGeometry(page));
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
    for (const id of changedPageIds) this.core.scenes.invalidate(id, true);
    this.core.graph.invalidateWithScenes(true);
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
    // Page passée dans un mode qui restreint les modes d'affichage (sujet 178).
    this.core.viewModes.enforce();
    this.core.rendering.requestRender();
  }

  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.unsupportedReport;
  }

  getFileId(): string | undefined {
    return this.fileId;
  }
}
