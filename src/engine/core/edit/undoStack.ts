/**
 * Annuler / rétablir (SPEC §14.1) par instantanés : avant chaque modification, l'état complet du
 * document (XML écrit) est empilé. Simple et sûr avec l'édition in situ : restaurer un instantané,
 * c'est relire un XML que l'on a soi-même écrit. Pile bornée ; une nouvelle modification après
 * une annulation efface ce qui pouvait être rétabli.
 */
export class UndoStack<T> {
  private undoStack: Array<{ label: string; state: T }> = [];
  private redoStack: Array<{ label: string; state: T }> = [];
  /** Nombre de modifications depuis l'état de départ (avancée dans l'historique). */
  private position = 0;
  /** Position de la dernière sauvegarde ; -1 si elle n'est plus atteignable. */
  private savedPosition = 0;

  constructor(private limit = 100) {}

  /** Change la taille de la pile (paramètre `edit.undoLimit`) ; les plus anciennes étapes en trop sont oubliées. */
  setLimit(limit: number): void {
    this.limit = limit;
    if (this.undoStack.length > limit) this.undoStack.splice(0, this.undoStack.length - limit);
  }

  /** À appeler juste avant une modification, avec l'état d'avant. */
  record(label: string, before: T): void {
    this.undoStack.push({ label, state: before });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    if (this.savedPosition > this.position) this.savedPosition = -1;
    this.redoStack = [];
    this.position++;
  }

  /** État à restaurer pour annuler ; `current` est empilé pour pouvoir rétablir. */
  undo(current: T): T | undefined {
    const entry = this.undoStack.pop();
    if (!entry) return undefined;
    this.redoStack.push({ label: entry.label, state: current });
    this.position--;
    return entry.state;
  }

  redo(current: T): T | undefined {
    const entry = this.redoStack.pop();
    if (!entry) return undefined;
    this.undoStack.push({ label: entry.label, state: current });
    this.position++;
    return entry.state;
  }

  /** Libellé de ce qu'annulerait / rétablirait le prochain appel. */
  undoLabel(): string | undefined {
    return this.undoStack.at(-1)?.label;
  }

  redoLabel(): string | undefined {
    return this.redoStack.at(-1)?.label;
  }

  /** L'état courant vient d'être sauvegardé. */
  markSaved(): void {
    this.savedPosition = this.position;
  }

  /** Vrai si l'état courant diffère de celui de la dernière sauvegarde. */
  isModified(): boolean {
    return this.position !== this.savedPosition;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.position = 0;
    this.savedPosition = 0;
  }
}
