import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { END_LABELS, SIMULATION_COLOR, simulationTrace } from '../../../../engine/plugins/modes/states/api';
import type { StateSimulation } from '../../../../engine/plugins/modes/states/api';

/**
 * Trace de la simulation dans le panneau de la page (sujet 463) : une ligne par pas, la transition franchie entre deux
 * pas, la fin en dernière ligne. Un clic sur une ligne revient à ce pas ; la liste défile pour garder le pas courant
 * visible.
 */
export function SimulationTrace({ sim, onGoTo }: { sim: StateSimulation; onGoTo: (step: number) => void }) {
  const lines = simulationTrace(sim);
  const end = sim.end();
  /** Dernière ligne à garder visible : la fin s'il y en a une, sinon le pas courant. */
  const shown = useRef<HTMLLIElement>(null);
  useEffect(() => {
    shown.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length, end]);
  return (
    <ol
      className="simulation-trace"
      aria-label="Trace de la simulation"
      // Couleur de la simulation, celle du moteur : fond du pas courant (sujet 472).
      style={{ '--simulation-color': SIMULATION_COLOR } as CSSProperties}
    >
      {lines.map((line, i) => {
        const isCurrent = line.kind === 'step' && line.current;
        const { target } = line;
        return (
          <li
            key={i}
            ref={isCurrent && !end ? shown : undefined}
            className={line.kind === 'transition' ? 'transition' : isCurrent ? 'current' : undefined}
          >
            <button
              type="button"
              disabled={target === undefined}
              data-tip={
                target !== undefined
                  ? 'Revenir à ce pas (les pas suivants sont oubliés)'
                  : isCurrent || line.kind === 'transition'
                    ? 'Pas courant'
                    : 'Pas traversé sans choix'
              }
              onClick={() => target !== undefined && onGoTo(target)}
            >
              {line.text}
              {line.kind === 'step' && line.count > 1 && <span className="simulation-count">×{line.count}</span>}
            </button>
          </li>
        );
      })}
      {end && (
        <li ref={shown} className="end" style={{ color: END_LABELS[end].color }}>
          {END_LABELS[end].text}
        </li>
      )}
    </ol>
  );
}
