import { useSyncExternalStore } from 'react';
import { StoryPlayback, StorySimulator } from '../../../../engine/plugins/modes/storytelling/api';
import type { PageModel } from '../../../../engine';
import type { ModePageControls } from '../registry';

/**
 * Simulation des histoires lancée depuis l'appli (sujet 534) : le reste (verrou, pas, touches, couche) est dans le
 * moteur (`StorySimulator`) ; l'appli suit ses pas.
 */

/** Simulation ouverte sur la page, s'il y en a une ; le composant est redessiné à chacun de ses pas. */
export function useStorySimulation(controls: ModePageControls | undefined): StorySimulator | undefined {
  const owner = controls?.lockOwner;
  const simulator = owner instanceof StorySimulator && owner.opened ? owner : undefined;
  useSyncExternalStore(
    (listener) => simulator?.subscribe(listener) ?? (() => {}),
    () => simulator?.version ?? 0,
  );
  return simulator;
}

/** Lance la simulation au tout début. */
export function launchStories(controls: ModePageControls, page: PageModel): void {
  StorySimulator.open(controls.takeover, new StoryPlayback(page));
}
