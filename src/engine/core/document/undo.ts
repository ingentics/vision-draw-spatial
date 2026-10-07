import { readDrawio } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import { UndoStack } from '../../edit/undo';
import type { EngineCore } from '../EngineCore';
import type { Settings } from '../../settings';

/** Annuler / rétablir (instantanés XML du document) et état « modifié » depuis la dernière sauvegarde. */
export class EditHistory {
  /** Modifications non sauvegardées. */
  private modified = false;
  readonly undoStack = new UndoStack<string>();
  /** Étapes enregistrées (et annulations / rétablissements) : repère des réglages en direct fusionnés. */
  private editCount = 0;
  /** Dernier réglage en direct (`setElementsStyle` avec `merge`) et le compte d'étapes à ce moment. */
  private lastMerge?: { key: string; edits: number };

  constructor(private readonly core: EngineCore) {}

  /** Paramètres changés : nombre d'étapes d'annulation gardées. */
  settingsChanged(settings: Settings): void {
    this.undoStack.setLimit(settings.edit.undoLimit);
  }

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
    if (!this.core.targets.editable || !this.core.file.xmlTree || !this.core.canInteract()) return;
    this.core.gesture.endMove();
    const previous = this.undoStack.undo(writeDrawio(this.core.file.xmlTree));
    if (previous !== undefined) this.restore(previous);
  }

  redo(): void {
    if (!this.core.targets.editable || !this.core.file.xmlTree || !this.core.canInteract()) return;
    this.core.gesture.endMove();
    const next = this.undoStack.redo(writeDrawio(this.core.file.xmlTree));
    if (next !== undefined) this.restore(next);
  }

  /** État avant une modification, pour pouvoir l'annuler. */
  recordEdit(label: string): void {
    this.editCount++;
    if (this.core.file.xmlTree) this.undoStack.record(label, writeDrawio(this.core.file.xmlTree));
  }

  /**
   * Étape d'un réglage en direct (ex. champ tapé au fil des frappes, clé `merge`) : une seule étape d'annulation tant
   * que rien d'autre n'a été enregistré entre-temps et que la clé est la même ; sans `merge`, une étape à chaque fois.
   */
  recordMergeableEdit(label: string, merge: string | undefined): void {
    const merged = merge !== undefined && this.lastMerge?.key === merge && this.lastMerge.edits === this.editCount;
    if (!merged) this.recordEdit(label);
    this.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.editCount };
  }

  /** Étape d'annulation à partir d'un instantané pris avant une modification qui a pu ne rien changer. */
  recordSnapshot(label: string, before: string): void {
    this.undoStack.record(label, before);
  }

  /** Document enregistré : plus rien de modifié. */
  markSaved(): void {
    this.undoStack.markSaved();
    this.syncModified();
  }

  /** Nouveau document : pile d'annulation vide, rien de modifié. */
  resetDocument(): void {
    this.undoStack.clear();
    this.syncModified();
  }

  /** Revient à un instantané : document relu, scènes reconstruites, même page si elle existe encore. */
  private restore(xml: string): void {
    // Annuler / rétablir : un réglage en direct qui reprend ensuite ouvre une nouvelle étape.
    this.editCount++;
    const { document, tree } = readDrawio(xml);
    this.core.file.replaceDocument(document, tree);
    this.core.selection.clearSelection();
    this.core.graph.invalidate();
    this.core.scenes.clear();
    const current = this.core.pages.currentPageId;
    const pageId =
      current && (this.core.graph.isGraph(current) || document.pages.some((p) => p.id === current))
        ? current
        : document.pages[0]?.id;
    this.core.pages.setCurrent(undefined);
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
