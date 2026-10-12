import type { EngineCore } from '../core/domains/EngineCore';

/** Annuler / rétablir et état « modifié » du document. */
export class HistoryApi {
  constructor(private readonly core: EngineCore) {}

  /** Modifications non sauvegardées depuis le chargement ou la dernière sérialisation. */
  isModified(): boolean {
    return this.core.edits.isModified();
  }

  canUndo(): boolean {
    return this.core.edits.canUndo();
  }

  canRedo(): boolean {
    return this.core.edits.canRedo();
  }

  undo(): void {
    this.core.edits.undo();
  }

  redo(): void {
    this.core.edits.redo();
  }
}
