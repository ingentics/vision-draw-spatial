import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { END_LABELS, stepName } from '../../../../engine/plugins/modes/states/api';
import type { ModeCanvasProps } from '../registry';
import { launch, launchFrom, useOpenedSimulation } from './simulationRun';
import type { LaunchIssue } from './simulationRun';
import { SimulationStart } from './SimulationStart';

/**
 * Barre flottante de la simulation (sujet 462), en bas de la zone de dessin : Recommencer, Retour, Suivant, Arrêter,
 * le pas courant, et le bandeau de fin. Hors simulation, un bouton la lance depuis la sélection (un état sélectionné
 * est le départ ; le bouton du panneau de la page n'est montré que sans sélection).
 */
export function SimulationBar({ page, controls }: ModeCanvasProps) {
  const simulator = useOpenedSimulation(controls);
  const [issue, setIssue] = useState<LaunchIssue>();
  useEffect(() => {
    setIssue(undefined);
  }, [page.id, simulator]);
  // Les boutons ne prennent pas le focus : les touches de la simulation restent à la zone de dessin.
  const keepFocus = (event: MouseEvent) => event.preventDefault();
  if (!simulator) {
    return (
      <div className="simulation-dock" onMouseDown={keepFocus}>
        {issue && (
          <div className="simulation-popup">
            <SimulationStart page={page} issue={issue} onChoose={(id) => launchFrom(controls, page, id)} />
          </div>
        )}
        <div className="simulation-bar">
          <button
            type="button"
            className="button"
            data-tip="Simuler la machine à états pas à pas, depuis l’état sélectionné ou le point d’entrée"
            onClick={() => setIssue(launch(controls, page))}
          >
            ▶ Lancer la simulation
          </button>
        </div>
      </div>
    );
  }
  const { sim } = simulator;
  const end = sim.end();
  const single = sim.canNext();
  const canBack = sim.canBack();
  return (
    <div className="simulation-dock" onMouseDown={keepFocus}>
      <div className="simulation-bar running" role="toolbar" aria-label="Simulation">
        <button
          type="button"
          className="button"
          disabled={!canBack}
          data-tip="Recommencer : revenir au départ de la simulation"
          onClick={() => simulator.restart()}
        >
          ⏮ Recommencer
        </button>
        <button
          type="button"
          className="button"
          disabled={!canBack}
          data-tip="Retour : revenir d’un pas (← ou Retour arrière)"
          onClick={() => simulator.back()}
        >
          ◀ Retour
        </button>
        <button
          type="button"
          className="button"
          disabled={!single}
          data-tip={
            single
              ? 'Suivant : franchir la seule transition proposée (ou taper 1)'
              : 'Suivant : seulement quand une seule transition est proposée ; sinon cliquer une pastille ou taper son numéro'
          }
          onClick={() => simulator.next()}
        >
          ▶ Suivant
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
          Pas {sim.stepNumber} · {stepName(sim.current)}
        </span>
        {end && (
          <span className="simulation-end" style={{ background: END_LABELS[end].color }}>
            {END_LABELS[end].text}
          </span>
        )}
      </div>
    </div>
  );
}
