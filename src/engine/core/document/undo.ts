import { collectUnsupported } from '../../diagnostics/unsupportedStyles';
import { readDrawio } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import { pageGeometry } from '../../edit/distribute';
import { UndoStack } from '../../edit/undo';
import { GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { EngineCore } from '../EngineCore';

/** Annuler / rétablir (instantanés XML du document) et état « modifié » depuis la dernière sauvegarde. */
export class EditHistory {
  /** Modifications non sauvegardées. */
  private modified = false;
  readonly undoStack = new UndoStack<string>();
  /** Étapes enregistrées (et annulations / rétablissements) : repère des réglages en direct fusionnés. */
  editCount = 0;
  /** Dernier réglage en direct (`setElementsStyle` avec `merge`) et le compte d'étapes à ce moment. */
  lastMerge?: { key: string; edits: number };

  constructor(private readonly core: EngineCore) {}

  isModified(): boolean {
    return this.modified;
  }

  private setModified(modified: boolean): void {
    if (this.modified === modified) return;
    this.modified = modified;
    this.core.events.emit('modifiedChange', modified);
  }

  canUndo(): boolean {
    return this.core.targets.editable && this.undoStack.undoLabel() !== undefined;
  }

  canRedo(): boolean {
    return this.core.targets.editable && this.undoStack.redoLabel() !== undefined;
  }

  undo(): void {
    if (!this.core.targets.editable || !this.core.file.xmlTree || this.core.transitions.active) return;
    this.core.gesture.endMove();
    const previous = this.undoStack.undo(writeDrawio(this.core.file.xmlTree));
    if (previous !== undefined) this.restore(previous);
  }

  redo(): void {
    if (!this.core.targets.editable || !this.core.file.xmlTree || this.core.transitions.active) return;
    this.core.gesture.endMove();
    const next = this.undoStack.redo(writeDrawio(this.core.file.xmlTree));
    if (next !== undefined) this.restore(next);
  }

  /** État avant une modification, pour pouvoir l'annuler. */
  recordEdit(label: string): void {
    this.editCount++;
    if (this.core.file.xmlTree) this.undoStack.record(label, writeDrawio(this.core.file.xmlTree));
  }

  /** Revient à un instantané : document relu, scènes reconstruites, même page si elle existe encore. */
  private restore(xml: string): void {
    // Annuler / rétablir : un réglage en direct qui reprend ensuite ouvre une nouvelle étape.
    this.editCount++;
    const { document, tree } = readDrawio(xml);
    this.core.file.document = this.core.pageModes.withModeWarnings(document);
    this.core.file.geometry = new Map(document.pages.map((p) => [p.id, pageGeometry(p)]));
    this.core.file.xmlTree = tree;
    this.core.file.unsupportedReport = collectUnsupported(document, this.core.registry);
    this.core.selection.clearSelection();
    this.core.graph.invalidate();
    this.core.scenes.clear();
    const current = this.core.pages.currentPageId;
    const pageId =
      current && (current === GRAPH_PAGE_ID || document.pages.some((p) => p.id === current))
        ? current
        : document.pages[0]?.id;
    this.core.pages.currentPageId = undefined;
    this.syncModified();
    this.core.events.emit('documentChange', document);
    if (pageId) this.core.pages.goToPage(pageId);
  }

  /** État « modifié » et libellés annuler / rétablir, d'après la pile d'annulation. */
  syncModified(): void {
    this.setModified(this.undoStack.isModified());
    this.core.events.emit('undoChange', this.undoStack.undoLabel(), this.undoStack.redoLabel());
  }
}
