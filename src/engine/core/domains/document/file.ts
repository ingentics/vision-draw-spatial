import { collectUnsupported } from '../../diagnostics/unsupportedStyles';
import type { UnsupportedReport } from '../../diagnostics/unsupportedStyles';
import { rewriteLabels, rewriteLabelsForWriting } from '../../format/fileLabels';
import { documentFromTree, readDrawio } from '../../format/parse';
import { writePageViews } from '../../format/viewState';
import { writeDrawio } from '../../format/write';
import type { DrawioTree } from '../../format/xmlTree';
import { pageGeometry } from '../../model/pageGeometry';
import type { PageGeometry } from '../../model/pageGeometry';
import type { DocumentModel, PageModel } from '../../model/types';
import type { InitialView } from '../types';
import type { EngineCore } from '../EngineCore';
import { freezeModel } from '../../model/freeze';
import { byId } from '../../model/pageIndex';

/**
 * Document chargé : arbre XML d'origine (écrit en place, SPEC §14.2), modèle relu de l'arbre, chargement et
 * sérialisation.
 */
export class DocumentFile {
  private model: DocumentModel | undefined;
  /** Géométrie des pages au dernier état enregistré (avant les modifications en direct d'un glisser). */
  private geometry = new Map<string, PageGeometry>();
  private tree: DrawioTree | undefined;
  private unsupportedReport: UnsupportedReport | undefined;
  private loadedFileId: string | undefined;
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

  /** Modèle du document chargé, relu de l'arbre (lecture seule : seul ce domaine le remplace). */
  get document(): DocumentModel | undefined {
    return this.model;
  }

  /** Arbre XML d'origine du document chargé, base de l'écriture in situ (SPEC §14.2). */
  get xmlTree(): DrawioTree | undefined {
    return this.tree;
  }

  /** Identifiant du fichier chargé (donné par l'appli). */
  get fileId(): string | undefined {
    return this.loadedFileId;
  }

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const start = performance.now();
    const read = readDrawio(xml);
    const { tree } = read;
    // Ce qu'un mode écrit en plus dans le fichier (sujet 478) n'est pas gardé par l'appli.
    const labelOf = this.core.pageModes.fileLabels(read.document.pages, 'import');
    const relabeled = labelOf && rewriteLabels(read.document, tree, labelOf).length > 0;
    const document = relabeled ? documentFromTree(tree) : read.document;
    this.core.metrics.fileRead(performance.now() - start);
    this.replaceDocument(document, tree);
    this.loadedFileId = fileId;
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

  serialize(): string | undefined {
    if (!this.tree) return undefined;
    this.core.gesture.endMove();
    writePageViews(this.tree, this.core.pages.savedViews());
    const restore = this.writeExportedLabels(this.tree);
    let xml: string;
    try {
      xml = writeDrawio(this.tree);
    } finally {
      restore();
    }
    this.core.edits.markSaved();
    return xml;
  }

  /**
   * Labels des formes tels que les modes les écrivent dans le fichier (sujets 478, 513), posés dans l'arbre le temps de
   * l'écrire : seules les pages d'un mode qui en écrit sont touchées. Renvoie de quoi les remettre comme avant.
   */
  private writeExportedLabels(tree: DrawioTree): () => void {
    const restores: Array<() => void> = [];
    for (const [index, page] of (this.model?.pages ?? []).entries()) {
      const labelOf = this.core.pageModes.fileLabels([page], 'export');
      const pageTree = tree.pages[index];
      const restore = labelOf && pageTree && rewriteLabelsForWriting(page, pageTree, labelOf);
      if (restore) restores.push(restore);
    }
    return () => {
      for (const restore of restores) restore();
    };
  }

  /**
   * Erreurs des plugins signalées après la lecture (sujet 288) : avertissements du document republiés, sans le
   * relire.
   */
  publishWarnings(): void {
    if (!this.model) return;
    const guard = this.core.pluginGuard;
    const warnings = [...this.model.warnings.filter((w) => !guard.owns(w)), ...guard.warnings()];
    this.model = { ...this.model, warnings };
    this.notifyChanged();
  }

  /**
   * Modification en direct écrite dans l'arbre, le modèle suivant sans être relu (`LiveEdit.afterLiveWrite`) : état
   * « modifié » et abonnés au document à jour.
   */
  liveWritten(): void {
    this.core.edits.syncModified();
    this.notifyChanged();
  }

  /** Abonnés prévenus du document en vigueur : ce domaine seul émet `documentChange` (sujet 385). */
  private notifyChanged(): void {
    if (this.model) this.core.events.emit('documentChange', this.model);
  }

  /**
   * Page `pageId` à modifier en direct pendant un geste (sujet 312), pour `owner` (le domaine du geste) : la copie de
   * travail, créée au premier appel (la sélection est reprise sur ses éléments), ou celle en cours ; undefined pour une
   * page inconnue. Une copie d'une autre page est d'abord close.
   */
  livePage(pageId: string, owner: object): PageModel | undefined {
    const document = this.model;
    const index = document?.pages.findIndex((p) => p.id === pageId) ?? -1;
    if (!document || index < 0) return undefined;
    if (this.livePageId === pageId) {
      this.liveOwners.add(owner);
      return document.pages[index];
    }
    this.closeLivePage();
    this.liveOwners.add(owner);
    const copy = structuredClone(document.pages[index]!) as PageModel;
    this.model = { ...document, pages: document.pages.map((page, i) => (i === index ? copy : page)) };
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
    const page = byId(this.model?.pages, pageId);
    if (page) freezeModel(page);
  }

  /** Document lu (chargement, annuler / rétablir) : modèle, géométrie des pages, arbre XML, styles non pris en charge. */
  replaceDocument(document: DocumentModel, tree: DrawioTree): void {
    this.livePageId = undefined;
    this.liveOwners.clear();
    for (const page of document.pages) freezeModel(page);
    this.model = this.withPluginWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.tree = tree;
    this.unsupportedReport = collectUnsupported(document, this.core.registry);
  }

  /**
   * Retour à un instantané (annuler / rétablir) : document relu, scènes reconstruites, même page si elle existe
   * encore.
   */
  restore(xml: string): void {
    const { document, tree } = readDrawio(xml);
    this.replaceDocument(document, tree);
    this.core.selection.clearSelection();
    this.core.graph.invalidate();
    this.core.scenes.clear();
    const current = this.core.pages.currentPageId;
    const pageId =
      current && (this.core.graph.isGraph(current) || document.pages.some((p) => p.id === current))
        ? current
        : document.pages[0]?.id;
    this.core.pages.setCurrent(undefined);
    this.core.edits.syncModified();
    this.notifyChanged();
    if (pageId) this.core.pages.goToPage(pageId);
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

  /** Géométrie enregistrée d'une page (dernière écriture), base des flèches à replacer après un glisser. */
  savedGeometry(pageId: string): PageGeometry | undefined {
    return this.geometry.get(pageId);
  }

  /** Page écrite après un glisser : sa géométrie enregistrée suit. */
  updateGeometry(page: PageModel): void {
    this.geometry.set(page.id, pageGeometry(page));
  }

  /** Arbre XML d'une page du document (même rang que dans le modèle). */
  pageTreeOf(pageId: string) {
    const index = this.model?.pages.findIndex((p) => p.id === pageId) ?? -1;
    return index >= 0 ? this.tree?.pages[index] : undefined;
  }

  /**
   * L'arbre a changé de structure : le modèle est relu de l'arbre, les scènes des pages touchées et
   * de la vue graphe sont reconstruites, la sélection est reprise par id.
   */
  documentChanged(changedPageIds: string[], options: { distribute?: boolean } = {}): void {
    if (!this.tree) return;
    const selected = this.core.selection.current;
    this.core.selection.clearSelection();
    let document = documentFromTree(this.tree);
    if (options.distribute !== false && this.core.arrangement.distributeAfterEdit(document, changedPageIds))
      document = documentFromTree(this.tree);
    this.livePageId = undefined;
    this.liveOwners.clear();
    for (const page of document.pages) freezeModel(page);
    this.model = this.withPluginWarnings(document);
    this.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.unsupportedReport = collectUnsupported(this.model, this.core.registry);
    this.core.levels.rebuildScenes(changedPageIds);
    const current = this.core.pages.getCurrentPage();
    if (current) {
      this.core.labelEditor.hideEditedLabel();
      this.core.selection.reselectIn(current, selected);
    }
    this.core.rendering.syncBackground();
    this.core.edits.syncModified();
    this.notifyChanged();
    // Page passée dans un mode qui restreint les modes d'affichage (sujet 178).
    this.core.viewModes.enforce();
    this.core.rendering.requestRender();
  }

  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.unsupportedReport;
  }
}
