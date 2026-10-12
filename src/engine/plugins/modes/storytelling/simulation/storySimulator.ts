import type { EditLock, PageTakeover } from '../../../../core/plugins';
import type { StoryPlayback } from './storyPlayback';

/** Touches de la simulation (sujet 534) : Page suivante / précédente sont celles des télécommandes de présentation. */
const KEYS: Record<string, (simulator: StorySimulator) => void> = {
  ArrowRight: (simulator) => simulator.next(),
  PageDown: (simulator) => simulator.next(),
  ArrowLeft: (simulator) => simulator.back(),
  PageUp: (simulator) => simulator.back(),
  ArrowDown: (simulator) => simulator.nextStory(),
  ArrowUp: (simulator) => simulator.previousStory(),
  Home: (simulator) => simulator.restart(),
  Escape: (simulator) => simulator.stop(),
};

/**
 * Simulation des histoires ouverte sur la page (sujet 534), sur les briques de la prise en main (`PageTakeover`) : elle
 * tient le verrou d'édition, capture les touches, cache tout sauf ce qui a été montré (voile qui masque, sujet 533),
 * choisit l'histoire du pas comme courant du mode et garde la forme montrée dans la vue. Elle se ferme par Arrêter,
 * Échap, ou quand le moteur rend le verrou (autre page, autre document). L'appli la suit par `subscribe`.
 */
export class StorySimulator {
  private lock: EditLock | undefined;
  private readonly listeners = new Set<() => void>();
  /** Change à chaque pas et à la fermeture (instantané pour l'appli). */
  private changes = 0;

  private constructor(
    private readonly takeover: PageTakeover,
    readonly playback: StoryPlayback,
  ) {}

  /** Ouvre la simulation sur la page affichée ; undefined sans pas ou si l'édition ne peut pas être verrouillée. */
  static open(takeover: PageTakeover, playback: StoryPlayback): StorySimulator | undefined {
    if (playback.beats.length === 0) return undefined;
    const simulator = new StorySimulator(takeover, playback);
    const lock = takeover.lockEditing(simulator, () => simulator.released());
    if (!lock) return undefined;
    simulator.lock = lock;
    lock.captureInput({ key: (key) => simulator.key(key) });
    simulator.show();
    return simulator;
  }

  get opened(): boolean {
    return this.lock !== undefined;
  }

  /** Compteur des changements, pour `useSyncExternalStore`. */
  get version(): number {
    return this.changes;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  next(): void {
    this.step(() => this.playback.next());
  }

  back(): void {
    this.step(() => this.playback.back());
  }

  nextStory(): void {
    this.step(() => this.playback.nextStory());
  }

  previousStory(): void {
    this.step(() => this.playback.previousStory());
  }

  restart(): void {
    this.step(() => this.playback.restart());
  }

  /** Arrête la simulation : verrou rendu, tout réapparaît. */
  stop(): void {
    this.lock?.release();
  }

  /** Touche capturée ; vrai si elle est prise (une touche inconnue revient à la vue). */
  private key(key: string): boolean {
    const run = KEYS[key];
    run?.(this);
    return run !== undefined;
  }

  private step(change: () => boolean): void {
    if (this.lock && change()) this.show();
  }

  /** Cache tout sauf ce qui a été montré ; histoire du pas comme courant ; forme montrée gardée dans la vue. */
  private show(): void {
    const { beat } = this.playback;
    this.takeover.setOverlay(this, { veil: { hide: true, kept: this.playback.shown() } });
    this.takeover.setModeCurrent(beat.story.id);
    if (beat.focus) this.takeover.keepInView(beat.focus, { around: this.playback.shownInStory(), whole: true });
    this.notify();
  }

  private released(): void {
    this.lock = undefined;
    this.takeover.clearOverlay(this);
    this.notify();
  }

  private notify(): void {
    this.changes++;
    for (const listener of [...this.listeners]) listener();
  }
}
