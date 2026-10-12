import { ModeSimulator } from '../../../../core/plugins';
import type { PageTakeover } from '../../../../core/plugins';
import { simulationKey } from './simulationKeys';
import { simulationOverlay } from './simulationLayer';
import type { Crossing } from './simulationLayer';
import { stepLook, upcoming } from './simulationView';
import type { StateSimulation } from './stateSimulation';

/**
 * Simulation d'une machine à états ouverte sur la page (sujets 462, 467) : assemble les briques que le moteur ouvre à
 * un mode (`PageTakeover`). Elle tient le verrou d'édition, capture clics et touches, pose la couche de chaque pas et
 * garde l'élément courant et sa suite dans la vue. Elle se ferme par Arrêter, Échap, ou quand le moteur rend le verrou (autre page,
 * autre document) : verrou, abonnés et fermeture sont ceux de `ModeSimulator`.
 */
export class StatesSimulator extends ModeSimulator {
  private constructor(
    takeover: PageTakeover,
    readonly sim: StateSimulation,
  ) {
    super(takeover);
  }

  /** Ouvre la simulation `sim` sur la page affichée ; undefined si l'édition ne peut pas être verrouillée. */
  static open(takeover: PageTakeover, sim: StateSimulation): StatesSimulator | undefined {
    const simulator = new StatesSimulator(takeover, sim);
    const started = simulator.start({
      // Clic sur une transition proposée ou sa pastille : elle est franchie.
      click: (id) => simulator.cross(id),
      clickable: (id) => sim.proposes(id),
      key: (key) => simulator.key(key),
    });
    if (!started) return undefined;
    simulator.show(undefined, true);
    return simulator;
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
    if (!this.opened) return;
    const before = stepLook(this.sim);
    const changed = change();
    if (changed === undefined || changed === false) return;
    this.show(typeof changed === 'string' ? { before, edgeId: changed } : undefined);
  }

  /**
   * Pose la couche du pas courant, garde l'élément courant dans la vue avec sa suite (sujet 527) ; `whole` (au départ) :
   * recadre aussi quand c'est la suite qui n'est pas entière dans la vue.
   */
  private show(crossing?: Crossing, whole = false): void {
    this.takeover.setOverlay(this, simulationOverlay(this.sim, crossing));
    this.takeover.keepInView(this.sim.current.id, { around: upcoming(this.sim), whole });
    this.notify();
  }
}
