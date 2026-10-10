import type { StateSimulation } from './stateSimulation';

/**
 * Touches de la simulation d'une machine à états (sujets 462, 465) : 1 à 9 franchissent la transition proposée de ce
 * numéro, ← ou Retour arrière reviennent d'un pas. Les autres touches, et celles qui n'auraient pas d'effet, restent à
 * la vue (caméra).
 */

/** Ce que fait une touche : franchir la transition proposée numéro `choose`, ou revenir d'un pas. */
export type SimulationMove = { choose: number } | { back: true };

/** Mouvement d'une touche (`KeyboardEvent.key`) sur la simulation ; undefined si elle n'en fait pas. */
export function simulationKey(sim: StateSimulation, key: string): SimulationMove | undefined {
  if (/^[1-9]$/.test(key)) {
    const n = Number(key);
    return n <= sim.proposals().length ? { choose: n } : undefined;
  }
  if (key === 'ArrowLeft' || key === 'Backspace') return sim.canBack() ? { back: true } : undefined;
  return undefined;
}
