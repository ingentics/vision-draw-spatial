import { useSyncExternalStore } from 'react';
import { StateSimulation, StatesSimulator, startSimulation } from '../../../../engine/plugins/modes/states/api';
import type { PageModel } from '../../../../engine';
import type { ModePageControls } from '../registry';

/**
 * Simulation de la machine à états lancée depuis l'appli (sujet 462) : départ selon la sélection. Le reste (verrou,
 * pas, touches, couche) est dans le moteur (`StatesSimulator`) ; l'appli suit ses pas.
 */

/**
 * Simulation de machine à états ouverte sur la page, s'il y en a une ; le composant est redessiné à chacun de ses pas.
 */
export function useOpenedSimulation(controls: ModePageControls | undefined): StatesSimulator | undefined {
  const owner = controls?.lockOwner;
  const simulator = owner instanceof StatesSimulator && owner.opened ? owner : undefined;
  useSyncExternalStore(
    (listener) => simulator?.subscribe(listener) ?? (() => {}),
    () => simulator?.version ?? 0,
  );
  return simulator;
}

/** Départ qui n'a pas abouti : points d'entrée à choisir, ou message. */
export type LaunchIssue = Exclude<ReturnType<typeof startSimulation>, { simulation: StateSimulation }>;

/** Lance la simulation selon la sélection ; rend ce qu'il reste à choisir ou le message, sinon undefined. */
export function launch(controls: ModePageControls, page: PageModel): LaunchIssue | undefined {
  const start = startSimulation(page, controls.selection);
  if (!('simulation' in start)) return start;
  StatesSimulator.open(controls.takeover, start.simulation);
  return undefined;
}

/** Lance la simulation depuis le point d'entrée choisi. */
export function launchFrom(controls: ModePageControls, page: PageModel, entryId: string): void {
  StatesSimulator.open(controls.takeover, new StateSimulation(page, entryId));
}
