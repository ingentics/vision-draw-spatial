import type { EditLock, InputCapture } from '../../modes/pageTakeover';
import type { EngineCore } from '../EngineCore';

/** Verrou tenu : son détenteur, sa page, de quoi le prévenir quand le moteur le rend. */
interface Held {
  lock: EditLock;
  released?: () => void;
}

/**
 * Verrou d'édition d'un mode sur la page affichée (sujet 467, brique de la prise en main de la page) : état de session,
 * jamais écrit. Tant qu'il est tenu, `EditTargets.canEditNow` est faux (formes, flèches, pages, annuler, rétablir) et
 * les entrées peuvent être capturées par son détenteur (`InputCaptures`). Rendu par son détenteur, ou par le moteur au
 * changement de page ou de document et à son arrêt.
 */
export class EditLocks {
  private held: Held | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Détenteur du verrou ; undefined sans verrou. */
  get owner(): object | undefined {
    return this.held?.lock.owner;
  }

  /** Page verrouillée ; undefined sans verrou. */
  get pageId(): string | undefined {
    return this.held?.lock.pageId;
  }

  lock(owner: object, released?: () => void): EditLock | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page || this.held || this.core.graph.isGraph(page.id) || !this.core.canInteract()) return undefined;
    this.core.gesture.endMove();
    this.core.labelEditor.closeLabelEdit();
    this.core.selection.clearSelection();
    const lock: EditLock = {
      owner,
      pageId: page.id,
      release: () => {
        if (this.held?.lock === lock) this.release();
      },
      captureInput: (capture: InputCapture) => {
        if (this.held?.lock === lock) this.core.inputCaptures.begin(lock, capture);
      },
    };
    this.held = { lock, released };
    this.changed();
    return lock;
  }

  /** Nouveau document : le verrou est rendu. */
  resetDocument(): void {
    this.release();
  }

  /** Page affichée : une autre page rend le verrou. */
  pageShown(pageId: string): void {
    if (this.held && this.held.lock.pageId !== pageId) this.release();
  }

  /** Arrêt du moteur : le verrou est rendu (son détenteur prévenu). */
  dispose(): void {
    this.release();
  }

  private release(): void {
    const held = this.held;
    if (!held) return;
    this.held = undefined;
    this.core.inputCaptures.end();
    // Le détenteur défait ce qu'il a posé (couche…) ; une erreur de sa part ne garde pas le verrou.
    if (held.released) this.core.pageModes.guardPage(held.lock.pageId, 'verrou rendu', undefined, held.released);
    this.changed();
  }

  /** Verrou pris ou rendu : l'appli grise ce qui modifie, annuler et rétablir suivent. */
  private changed(): void {
    this.core.events.emit('editLockChange', this.owner);
    this.core.edits.editLockChanged(this.held !== undefined);
  }
}
