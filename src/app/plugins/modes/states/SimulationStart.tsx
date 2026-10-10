import { entryName } from '../../../../engine/plugins/modes/states/api';
import type { PageModel } from '../../../../engine';
import type { LaunchIssue } from './simulationRun';

/**
 * Départ de la simulation qui n'a pas abouti (sujet 462) : petite liste des points d'entrée de premier niveau à
 * choisir, ou le message (aucun point d'entrée).
 */
export function SimulationStart({
  page,
  issue,
  onChoose,
}: {
  page: PageModel;
  issue: LaunchIssue;
  onChoose: (entryId: string) => void;
}) {
  if ('error' in issue) return <p className="panel-hint simulation-message">{issue.error}</p>;
  return (
    <div className="simulation-entries" role="group" aria-label="Point d’entrée de la simulation">
      <p className="panel-hint">Plusieurs points d’entrée : d’où partir ?</p>
      {issue.entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="button"
          data-tip="Lancer la simulation depuis ce point d’entrée"
          onClick={() => onChoose(entry.id)}
        >
          {entryName(page, entry)}
        </button>
      ))}
    </div>
  );
}
