import type { MouseEvent } from 'react';
import { storyState } from '../../../../engine/plugins/modes/storytelling/api';
import type { ModeCanvasProps } from '../registry';
import { useStorySimulation } from './storyRun';

/**
 * Barre flottante de la simulation des histoires (sujet 534), en bas de la zone de dessin : Tout début, Histoire
 * précédente, Précédent, Suivant, Histoire suivante, Arrêter, et le pas courant. Hors simulation, rien (sujet 540 : on
 * la lance depuis la section « Histoires »).
 */
export function StoryBar({ page, controls }: ModeCanvasProps) {
  const simulator = useStorySimulation(controls);
  // Les boutons ne prennent pas le focus : les touches de la simulation restent à la zone de dessin.
  const keepFocus = (event: MouseEvent) => event.preventDefault();
  if (!simulator) return null;
  const { playback } = simulator;
  const { beat } = playback;
  const stories = storyState(page).stories.length;
  return (
    <div className="simulation-dock" onMouseDown={keepFocus}>
      <div className="simulation-bar running" role="toolbar" aria-label="Simulation des histoires">
        <button
          type="button"
          className="button"
          disabled={!playback.canBack()}
          data-tip="Tout début : premier pas de la première histoire (Début)"
          onClick={() => simulator.restart()}
        >
          ⏮ Tout début
        </button>
        <button
          type="button"
          className="button"
          disabled={!playback.canBack()}
          data-tip="Histoire précédente : début de l’histoire en cours, ou de la précédente si on y est déjà (↑)"
          onClick={() => simulator.previousStory()}
        >
          ⏪ Histoire précédente
        </button>
        <button
          type="button"
          className="button"
          disabled={!playback.canBack()}
          data-tip="Précédent : un pas en arrière (← ou Page précédente)"
          onClick={() => simulator.back()}
        >
          ◀ Précédent
        </button>
        <button
          type="button"
          className="button"
          disabled={!playback.canNext()}
          data-tip="Suivant : montrer la flèche suivante et sa forme d’arrivée (→ ou Page suivante)"
          onClick={() => simulator.next()}
        >
          ▶ Suivant
        </button>
        <button
          type="button"
          className="button"
          disabled={!playback.canNextStory()}
          data-tip="Histoire suivante : début de l’histoire suivante, la fin de celle-ci apparaît d’un coup (↓)"
          onClick={() => simulator.nextStory()}
        >
          ⏩ Histoire suivante
        </button>
        <button
          type="button"
          className="button"
          data-tip="Arrêter la simulation et revenir à l’édition (Échap)"
          onClick={() => simulator.stop()}
        >
          ⏹ Arrêter
        </button>
        <span className="simulation-step">
          Histoire {beat.story.number} / {stories} · {beat.story.title} · pas {beat.index + 1} / {playback.storyLength}
        </span>
      </div>
    </div>
  );
}
