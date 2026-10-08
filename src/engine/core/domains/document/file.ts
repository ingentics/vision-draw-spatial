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
import { freezeModel } from '../../model/freeze';
import { byId, edgeOf, shapeOf } from '../../model/pageIndex';

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
  /**
   * Page en cours de modification en direct (sujet 312) : pendant un geste, la page du document est remplacée par une
   * copie modifiable, que les aperçus changent en place et que tout le moteur lit ; le modèle lu de l'arbre n'est
   * jamais modifié. À la fin du geste (`settleLivePage`), la copie, conforme à l'arbre, est gelée comme le reste du
   * document ; une relecture du document l'abandonne. Plusieurs détenteurs peuvent la partager (ex. texte en édition
   * pendant un glisser) : elle n'est close que lorsque le dernier la rend.
   */
  private livePageId: string | undefined;
  private readonly liveOwners = new Set<object>();

  constructor(private readonly core: EngineCore) {}

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const start = performance.now();
    const { document, tree } = readDrawio(xml);
    this.core.metrics.fileRead(performance.now() - start);
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
    // Pages d'un mode remises en ordre à l'ouverture (ex. tables RDD ajustées, sujet 255).
    this.core.modeFollowUps.documentOpened();
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

  /**
   * Erreurs des plugins signalées après la lecture (sujet 288) : avertissements du document republiés, sans le
   * relire.
   */
  publishWarnings(): void {
    if (!this.document) return;
    const guard = this.core.pluginGuard;
    const warnings = [...this.document.warnings.filter((w) => !guard.owns(w)), ...guard.warnings()];
    this.document = { ...this.document, warnings };
    this.core.events.emit('documentChange', this.document);
  }

  /**
   * Page `pageId` à modifier en direct pendant un geste (sujet 312), pour `owner` (le domaine du geste) : la copie de
   * travail, créée au premier appel (la sélection est reprise sur ses éléments), ou celle en cours ; undefined pour une
   * page inconnue. Une copie d'une autre page est d'abord close.
   */
  livePage(pageId: string, owner: object): PageModel | undefined {
    const document = this.document;
    const index = document?.pages.findIndex((p) => p.id === pageId) ?? -1;
    if (!document || index < 0) return undefined;
    if (this.livePageId === pageId) {
      this.liveOwners.add(owner);
      return document.pages[index];
    }
    this.closeLivePage();
    this.liveOwners.add(owner);
    const copy = structuredClone(document.pages[index]!) as PageModel;
    this.document = { ...document, pages: document.pages.map((page, i) => (i === index ? copy : page)) };
    this.livePageId = pageId;
    this.core.selection.rebind(copy);
    return copy;
  }

  /**
   * Fin du geste de `owner` : il rend la copie de travail ; rendue par tous, elle devient, désormais conforme à l'arbre,
   * une page du document (gelée).
   */
  settleLivePage(owner: object): void {
    this.liveOwners.delete(owner);
    if (this.liveOwners.size === 0) this.closeLivePage();
  }

  private closeLivePage(): void {
    const pageId = this.livePageId;
    this.livePageId = undefined;
    this.liveOwners.clear();
    const page = byId(this.document?.pages, pageId);
    if (page) freezeModel(page);
  }

  /** Document lu (chargement, annuler / rétablir) : modèle, géométrie des pages, arbre XML, styles non pris en charge. */
  replaceDocument(document: DocumentModel, tree: DrawioTree): void {
    this.livePageId = undefined;
    this.liveOwners.clear();
    for (const page of document.pages) freezeModel(page);
    this.document = this.withPluginWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.xmlTree = tree;
    this.unsupportedReport = collectUnsupported(document, this.core.registry);
  }

  /**
   * Avertissements des plugins ajoutés à ceux de la lecture (sujet 378) : modes (inconnus, données remises en ordre),
   * effets inconnus, puis erreurs des plugins signalées jusque-là. Les formes inconnues vont au recensement des formes
   * non prises en charge (`collectUnsupported`), pas aux avertissements.
   */
  private withPluginWarnings(document: DocumentModel): DocumentModel {
    this.core.pageModes.withModeWarnings(document);
    document.warnings.push(...this.core.pageEffects.warnings(document), ...this.core.pluginGuard.warnings());
    return document;
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
    this.livePageId = undefined;
    this.liveOwners.clear();
    for (const page of document.pages) freezeModel(page);
    this.document = this.withPluginWarnings(document);
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
        const shape = shapeOf(current, element.id);
        const edge = edgeOf(current, element.id);
        if (shape) items.push({ type: 'shape', element: shape });
        else if (edge) items.push({ type: 'edge', element: edge });
      }
      if (items.length > 0) this.core.selection.selectItems(items, selected.part);
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
