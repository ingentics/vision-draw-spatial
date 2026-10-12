import { useSyncExternalStore } from 'react';
import type { ModePageControls } from './registry';

/** Ce qu'un simulateur de mode offre à l'appli pour la suivre (`StatesSimulator`, `StorySimulator`). */
interface FollowedSimulator {
  readonly opened: boolean;
  readonly version: number;
  subscribe(listener: () => void): () => void;
}

/**
 * Simulation du mode ouverte sur la page (sujets 462, 534), s'il y en a une : elle détient le verrou d'édition, et
 * `isMine` la reconnaît (ex. `owner instanceof StorySimulator`) ; le composant est redessiné à chacun de ses pas.
 */
export function useOpenedSimulator<T extends FollowedSimulator>(
  controls: ModePageControls | undefined,
  isMine: (owner: object) => owner is T,
): T | undefined {
  const owner = controls?.lockOwner;
  const simulator = owner && isMine(owner) && owner.opened ? owner : undefined;
  useSyncExternalStore(
    (listener) => simulator?.subscribe(listener) ?? (() => {}),
    () => simulator?.version ?? 0,
  );
  return simulator;
}
