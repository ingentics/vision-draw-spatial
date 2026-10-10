import { useSyncExternalStore } from 'react';
import {
  StateSimulation,
  StatesSimulator,
  startSimulation,
  topEntries,
} from '../../../../engine/plugins/modes/states/api';
import type { PageModel, PageTakeover } from '../../../../engine';
import type { ModePageControls } from '../registry';

/**
 * Simulation de la machine à états lancée depuis l'appli (sujets 462, 466) : départ selon la sélection, ou choix du
 * point d'entrée dans le lanceur. Le reste (verrou, pas, touches, couche) est dans le moteur (`StatesSimulator`) ;
 * l'appli suit ses pas.
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

/**
 * Lanceur ouvert (liste des points d'entrée, ou message sans point d'entrée) : un par moteur, partagé par la barre et
 * le panneau de la page. Il ne garde que la page où il est ouvert ; son contenu est relu sur la page à chaque rendu.
 */
class Launcher {
  pageId: string | undefined;
  private readonly listeners = new Set<() => void>();

  set(pageId: string | undefined): void {
    if (this.pageId === pageId) return;
    this.pageId = pageId;
    for (const listener of [...this.listeners]) listener();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

/** Lanceur de chaque moteur (cache par objet : un moteur recréé a le sien). */
const launchers = new WeakMap<PageTakeover, Launcher>();

function launcherOf(controls: ModePageControls): Launcher {
  let launcher = launchers.get(controls.takeover);
  if (!launcher) launchers.set(controls.takeover, (launcher = new Launcher()));
  return launcher;
}

/** Lanceur de la page : ouvert ou non, et de quoi le refermer ; sans `controls`, jamais ouvert. */
export function useLauncher(controls: ModePageControls | undefined, page: PageModel) {
  const launcher = controls && launcherOf(controls);
  const pageId = useSyncExternalStore(
    (listener) => launcher?.subscribe(listener) ?? (() => {}),
    () => launcher?.pageId,
  );
  return { open: pageId === page.id, close: () => launcher?.set(undefined) };
}

/** Lance la simulation selon la sélection ; sans départ évident, ouvre le lanceur. */
export function launch(controls: ModePageControls, page: PageModel): void {
  const start = startSimulation(page, controls.selection);
  if ('simulation' in start) open(controls, start.simulation);
  else launcherOf(controls).set(page.id);
}

/** Lance la simulation depuis le point d'entrée choisi, s'il est encore un départ possible de la page. */
export function launchFrom(controls: ModePageControls, page: PageModel, entryId: string): void {
  if (!topEntries(page).some((entry) => entry.id === entryId)) return;
  open(controls, new StateSimulation(page, entryId));
}

function open(controls: ModePageControls, sim: StateSimulation): void {
  if (StatesSimulator.open(controls.takeover, sim)) launcherOf(controls).set(undefined);
}
