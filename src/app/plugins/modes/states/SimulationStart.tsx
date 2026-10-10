import { useEffect } from 'react';
import { NO_ENTRY, entryName, topEntries } from '../../../../engine/plugins/modes/states/api';
import type { PageModel } from '../../../../engine';

/**
 * Lanceur de la simulation (sujets 462, 466), quand le départ n'est pas évident : les points d'entrée de premier niveau
 * de la page à choisir, ou le message sans point d'entrée. Relu sur la page à chaque rendu ; fermé par sa croix ou
 * Échap.
 */
export function SimulationStart({
  page,
  onChoose,
  onClose,
}: {
  page: PageModel;
  onChoose: (entryId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const entries = topEntries(page);
  return (
    <div className="simulation-start">
      <button
        type="button"
        className="icon-button simulation-start-close"
        data-tip="Fermer (Échap)"
        aria-label="Fermer"
        onClick={onClose}
      >
        ×
      </button>
      {entries.length === 0 ? (
        <p className="panel-hint simulation-message">{NO_ENTRY}</p>
      ) : (
        <div className="simulation-entries" role="group" aria-label="Point d’entrée de la simulation">
          <p className="panel-hint">
            {entries.length > 1 ? 'Plusieurs points d’entrée : d’où partir ?' : 'Partir de :'}
          </p>
          {entries.map((entry) => (
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
      )}
    </div>
  );
}
