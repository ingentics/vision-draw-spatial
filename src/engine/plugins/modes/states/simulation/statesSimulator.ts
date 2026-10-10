import type { EditLock, PageTakeover } from '../../../../core/plugins';
import { simulationKey } from './simulationKeys';
import { simulationOverlay } from './simulationLayer';
import type { Crossing } from './simulationLayer';
import { stepLook } from './simulationView';
import type { StateSimulation } from './stateSimulation';

/**
 * Simulation d'une machine à états ouverte sur la page (sujets 462, 467) : assemble les briques que le moteur ouvre à
 * un mode (`PageTakeover`). Elle tient le verrou d'édition, capture clics et touches, pose la couche de chaque pas et
 * garde l'élément courant dans la vue. Elle se ferme par Arrêter, Échap, ou quand le moteur rend le verrou (autre page,
 * autre document). L'appli la suit par `subscribe` et la reconnaît comme détenteur du verrou (`editLockChange`).
 */
export class StatesSimulator {
  private lock: EditLock | undefined;
  private readonly listeners = new Set<() => void>();
  /** Change à chaque pas et à la fermeture (instantané pour l'appli). */
  private changes = 0;

  private constructor(
    private readonly takeover: PageTakeover,
    readonly sim: StateSimulation,
  ) {}

  /** Ouvre la simulation `sim` sur la page affichée ; undefined si l'édition ne peut pas être verrouillée. */
  static open(takeover: PageTakeover, sim: StateSimulation): StatesSimulator | undefined {
    const simulator = new StatesSimulator(takeover, sim);
    const lock = takeover.lockEditing(simulator, () => simulator.released());
    if (!lock) return undefined;
    simulator.lock = lock;
    lock.captureInput({
      // Clic sur une transition proposée ou sa pastille : elle est franchie.
      click: (id) => simulator.cross(id),
      clickable: (id) => sim.proposes(id),
      key: (key) => simulator.key(key),
    });
    simulator.show();
    return simulator;
  }

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

  /** Franchit la transition `edgeId`, si elle est proposée. */
  cross(edgeId: string): void {
    this.step(() => this.sim.cross(edgeId) && edgeId);
  }

  /** Franchit la transition proposée numéro `n` (à partir de 1). */
  choose(n: number): void {
    this.step(() => this.sim.choose(n));
  }

  /** Suivant : seulement s'il n'y a qu'une transition proposée. */
  next(): void {
    this.step(() => this.sim.next());
  }

  back(): void {
    this.step(() => this.sim.back());
  }

  restart(): void {
    this.step(() => this.sim.restart());
  }

  goTo(n: number): void {
    this.step(() => this.sim.goTo(n));
  }

  /** Arrête la simulation : verrou rendu, couche retirée. */
  stop(): void {
    this.lock?.release();
  }

  /** Touche capturée : Échap arrête, les touches de la simulation (`simulationKey`) font un pas ; vrai si prise. */
  private key(key: string): boolean {
    if (key === 'Escape') {
      this.stop();
      return true;
    }
    const move = simulationKey(this.sim, key);
    if (!move) return false;
    if ('choose' in move) this.choose(move.choose);
    else this.back();
    return true;
  }

  /**
   * Change de pas, puis montre le nouveau ; `change` rend la transition franchie (parcourue par le point), vrai pour un
   * retour, faux ou undefined si rien n'a changé.
   */
  private step(change: () => string | boolean | undefined): void {
    if (!this.lock) return;
    const before = stepLook(this.sim);
    const changed = change();
    if (changed === undefined || changed === false) return;
    this.show(typeof changed === 'string' ? { before, edgeId: changed } : undefined);
  }

  /** Pose la couche du pas courant, garde l'élément courant dans la vue. */
  private show(crossing?: Crossing): void {
    this.takeover.setOverlay(this, simulationOverlay(this.sim, crossing));
    this.takeover.keepInView(this.sim.current.id);
    this.notify();
  }

  /** Verrou rendu (Arrêter, Échap, autre page, autre document) : couche retirée. */
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
