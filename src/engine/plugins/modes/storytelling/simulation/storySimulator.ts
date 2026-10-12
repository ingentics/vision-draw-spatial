import { ModeSimulator } from '../../../../core/plugins';
import type { PageTakeover } from '../../../../core/plugins';
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
 * Échap, ou quand le moteur rend le verrou (autre page, autre document) : verrou, abonnés et fermeture sont ceux de
 * `ModeSimulator`.
 */
export class StorySimulator extends ModeSimulator {
  private constructor(
    takeover: PageTakeover,
    readonly playback: StoryPlayback,
  ) {
    super(takeover);
  }

  /** Ouvre la simulation sur la page affichée ; undefined sans pas ou si l'édition ne peut pas être verrouillée. */
  static open(takeover: PageTakeover, playback: StoryPlayback): StorySimulator | undefined {
    if (playback.beats.length === 0) return undefined;
    const simulator = new StorySimulator(takeover, playback);
    if (!simulator.start({ key: (key) => simulator.key(key) })) return undefined;
    simulator.show();
    return simulator;
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

  /** Touche capturée ; vrai si elle est prise (une touche inconnue revient à la vue). */
  private key(key: string): boolean {
    const run = KEYS[key];
    run?.(this);
    return run !== undefined;
  }

  private step(change: () => boolean): void {
    if (this.opened && change()) this.show();
  }

  /** Cache tout sauf ce qui a été montré ; histoire du pas comme courant ; forme montrée gardée dans la vue. */
  private show(): void {
    const { beat } = this.playback;
    this.takeover.setOverlay(this, { veil: { hide: true, kept: this.playback.shown() } });
    this.takeover.setModeCurrent(beat.story.id);
    if (beat.focus) this.takeover.keepInView(beat.focus, { around: this.playback.shownInStory(), whole: true });
    this.notify();
  }
}
