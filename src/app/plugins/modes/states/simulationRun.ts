import {
  StateSimulation,
  simulationFrame,
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
  const proposed = (id: string) => sim.proposals().some(({ edge }) => edge.id === id);
  const opened = controls.open(sim, {
    // Clic sur une transition proposée ou sa pastille : elle est franchie.
    click: (id) => {
      if (proposed(id)) actions.cross(id);
    },
    clickable: proposed,
    key: (key) => simulationKey(actions, key),
  });
  if (opened) controls.show(simulationFrame(sim));
}

/** Opérations de la barre, de la trace et du clavier sur la simulation ouverte. */
export function simulationActions(controls: ModeSimulationControls, sim: StateSimulation) {
  /** Change de pas, puis montre le nouveau ; `crossed` : transition franchie, parcourue par le point. */
  const step = (change: () => boolean, crossed?: string) => {
    const before = stepLook(sim);
    if (change()) controls.show(simulationFrame(sim, crossed === undefined ? undefined : { before, edgeId: crossed }));
  };
  const cross = (edgeId: string) => step(() => sim.cross(edgeId), edgeId);
  return {
    cross,
    /** Transition proposée numéro `n` (à partir de 1). */
    choose: (n: number) => {
      const proposal = sim.proposals()[n - 1];
      if (proposal) cross(proposal.edge.id);
    },
    /** Suivant : seulement s'il n'y a qu'une transition proposée. */
    next: () => {
      const proposals = sim.proposals();
      if (proposals.length === 1) cross(proposals[0]!.edge.id);
    },
    back: () => step(() => sim.back()),
    restart: () => step(() => sim.restart()),
    goTo: (n: number) => step(() => sim.goTo(n)),
    stop: () => controls.close(),
  };
}

/** Clavier : 1 à 9 franchit la transition de ce numéro, → ou Espace = Suivant, ← ou Retour arrière = Retour. */
function simulationKey(actions: ReturnType<typeof simulationActions>, key: string): boolean {
  if (/^[1-9]$/.test(key)) actions.choose(Number(key));
  else if (key === 'ArrowRight' || key === ' ') actions.next();
  else if (key === 'ArrowLeft' || key === 'Backspace') actions.back();
  else return false;
  return true;
}
