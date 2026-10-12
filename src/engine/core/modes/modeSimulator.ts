import type { EditLock, InputCapture, PageTakeover } from './pageTakeover';

/**
 * Simulation d'un mode ouverte sur la page (sujets 462, 534, 535), base commune des simulateurs des modes : elle tient
 * le verrou d'édition et capture les entrées par les briques de la prise en main (`PageTakeover`), compte ses
 * changements et prévient ses abonnés (l'appli la suit par `subscribe` et la reconnaît comme détenteur du verrou).
 * Elle se ferme par `stop`, ou quand le moteur rend le verrou (autre page, autre document) : sa couche est retirée.
 * Un simulateur l'étend : il ouvre par `start` et montre chaque pas par `notify` après avoir posé sa couche.
 */
export abstract class ModeSimulator {
  private lock: EditLock | undefined;
  private readonly listeners = new Set<() => void>();
  /** Change à chaque pas et à la fermeture (instantané pour l'appli). */
  private changes = 0;

  protected constructor(protected readonly takeover: PageTakeover) {}

  /** La simulation est-elle encore ouverte ? */
  get opened(): boolean {
    return this.lock !== undefined;
  }

  /** Compteur des changements, pour `useSyncExternalStore`. */
  get version(): number {
    return this.changes;
  }

  /** Suit les pas et la fermeture ; rend de quoi ne plus suivre. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Arrête la simulation : verrou rendu, couche retirée. */
  stop(): void {
    this.lock?.release();
  }

  /** Verrouille l'édition et capture les entrées `input` ; faux si le verrou n'a pas pu être pris. */
  protected start(input: InputCapture): boolean {
    const lock = this.takeover.lockEditing(this, () => this.released());
    if (!lock) return false;
    this.lock = lock;
    lock.captureInput(input);
    return true;
  }

  /** Abonnés prévenus d'un pas (après la couche posée) ou de la fermeture. */
  protected notify(): void {
    this.changes++;
    for (const listener of [...this.listeners]) listener();
  }

  /** Verrou rendu (Arrêter, Échap, autre page, autre document) : couche retirée. */
  private released(): void {
    this.lock = undefined;
    this.takeover.clearOverlay(this);
    this.notify();
  }
}
