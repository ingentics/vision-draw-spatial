import { writeDrawio } from '../../format/write';
import { UndoStack } from '../../edit/undoStack';
import type { EngineCore } from '../EngineCore';
import type { Settings } from '../../settings';

/** Annuler / rétablir (instantanés XML du document) et état « modifié » depuis la dernière sauvegarde. */
export class EditHistory {
  /** Modifications non sauvegardées. */
  private modified = false;
  readonly undoStack = new UndoStack<string>();
  /** Étapes enregistrées (et annulations / rétablissements) : repère des réglages en direct fusionnés. */
  private editCount = 0;
  /** Dernier réglage en direct (`setElementsStyle`, `setModeProperty` avec `merge`) et le compte d'étapes à ce moment. */
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
    return this.core.targets.isEditable() && this.undoStack.undoLabel() !== undefined;
  }

  canRedo(): boolean {
    return this.core.targets.isEditable() && this.undoStack.redoLabel() !== undefined;
  }

  undo(): void {
    if (!this.core.targets.isEditable() || !this.core.file.xmlTree || !this.core.canInteract()) return;
    this.core.gesture.endMove();
    const previous = this.undoStack.undo(writeDrawio(this.core.file.xmlTree));
    if (previous !== undefined) this.restore(previous);
  }

  redo(): void {
    if (!this.core.targets.isEditable() || !this.core.file.xmlTree || !this.core.canInteract()) return;
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
    if (!this.merges(merge)) this.recordEdit(label);
    this.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.editCount };
  }

  /**
   * Étape d'annulation à partir d'un instantané pris avant une modification qui a pu ne rien changer ; `merge` :
   * réglage en direct, fusionné comme `recordMergeableEdit` (sujet 271).
   */
  recordSnapshot(label: string, before: string, merge?: string): void {
    if (!this.merges(merge)) {
      this.editCount++;
      this.undoStack.record(label, before);
    }
    this.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.editCount };
  }

  /** Le réglage en direct `merge` prolonge-t-il la dernière étape (même clé, rien d'enregistré entre-temps) ? */
  private merges(merge: string | undefined): boolean {
    return merge !== undefined && this.lastMerge?.key === merge && this.lastMerge.edits === this.editCount;
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

  /** Revient à un instantané : le document le relit et reconstruit l'affichage. */
  private restore(xml: string): void {
    // Annuler / rétablir : un réglage en direct qui reprend ensuite ouvre une nouvelle étape.
    this.editCount++;
    this.core.file.restore(xml);
  }

  /** État « modifié » et libellés annuler / rétablir, d'après la pile d'annulation. */
  syncModified(): void {
    this.setModified(this.undoStack.isModified());
    this.core.events.emit('undoChange', this.undoStack.undoLabel(), this.undoStack.redoLabel());
  }
}
