import {
  StateSimulation,
  simulationFrame,
  simulationKey,
  startSimulation,
  stepLook,
} from '../../../../engine/plugins/modes/states/api';
import type { PageModel } from '../../../../engine';
import type { ModeSimulationControls } from '../registry';

/**
 * Simulation de la machine à états pilotée depuis l'appli (sujet 462) : départ, pas, touches. La logique est dans le
 * moteur (`engine/plugins/modes/states/simulation/`) ; ici, seulement le lien entre ses opérations et la simulation
 * du moteur (rendu, clics, touches).
 */

/** Simulation de machine à états ouverte sur la page, s'il y en a une. */
export function openedSimulation(controls: ModeSimulationControls | undefined): StateSimulation | undefined {
  return controls?.owner instanceof StateSimulation ? controls.owner : undefined;
}

/** Départ qui n'a pas abouti : points d'entrée à choisir, ou message. */
export type LaunchIssue = Exclude<ReturnType<typeof startSimulation>, { simulation: StateSimulation }>;

/** Lance la simulation selon la sélection ; rend ce qu'il reste à choisir ou le message, sinon undefined. */
export function launch(controls: ModeSimulationControls, page: PageModel): LaunchIssue | undefined {
  const start = startSimulation(page, controls.selection);
  if (!('simulation' in start)) return start;
  run(controls, start.simulation);
  return undefined;
}

/** Lance la simulation depuis le point d'entrée choisi. */
export function launchFrom(controls: ModeSimulationControls, page: PageModel, entryId: string): void {
  run(controls, new StateSimulation(page, entryId));
}

function run(controls: ModeSimulationControls, sim: StateSimulation): void {
  const actions = simulationActions(controls, sim);
  const opened = controls.open(sim, {
    // Clic sur une transition proposée ou sa pastille : elle est franchie.
    click: (id) => actions.cross(id),
    clickable: (id) => sim.proposes(id),
    key: (key) => {
      const move = simulationKey(sim, key);
      if (!move) return false;
      if ('choose' in move) actions.choose(move.choose);
      else actions.back();
      return true;
    },
  });
  if (opened) controls.show(simulationFrame(sim));
}

/** Opérations de la barre, de la trace et du clavier sur la simulation ouverte : chacune montre le nouveau pas. */
export function simulationActions(controls: ModeSimulationControls, sim: StateSimulation) {
  /**
   * Change de pas, puis montre le nouveau ; `change` rend la transition franchie (parcourue par le point), vrai pour un
   * retour, faux ou undefined si rien n'a changé.
   */
  const step = (change: () => string | boolean | undefined) => {
    const before = stepLook(sim);
    const changed = change();
    if (changed === undefined || changed === false) return;
    controls.show(simulationFrame(sim, typeof changed === 'string' ? { before, edgeId: changed } : undefined));
  };
  return {
    cross: (edgeId: string) => step(() => sim.cross(edgeId) && edgeId),
    /** Transition proposée numéro `n` (à partir de 1). */
    choose: (n: number) => step(() => sim.choose(n)),
    /** Suivant : seulement s'il n'y a qu'une transition proposée. */
    next: () => step(() => sim.next()),
    back: () => step(() => sim.back()),
    restart: () => step(() => sim.restart()),
    goTo: (n: number) => step(() => sim.goTo(n)),
    stop: () => controls.close(),
  };
}
