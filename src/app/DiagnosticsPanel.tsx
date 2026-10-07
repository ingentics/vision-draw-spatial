import type { ParseWarning, UnsupportedCategory, UnsupportedReport } from '../engine';
import { CollapseButton } from './Sidebar';

const CATEGORY_LABELS: Record<UnsupportedCategory, string> = {
  shape: 'Forme',
  edgeStyle: 'Tracé d’arête',
  startArrow: 'Pointe de départ',
  endArrow: 'Pointe d’arrivée',
};

interface DiagnosticsPanelProps {
  report: UnsupportedReport | undefined;
  /** Avertissements du document : lecture, modes, effets, et erreurs des plugins (niveau `error`). */
  warnings: ParseWarning[];
  /** Erreur de l'appli (chargement, sauvegarde). */
  appError: string | undefined;
  pageNames: Record<string, string>;
  onFocus: (pageId: string, elementId: string) => void;
  onExport: () => void;
  onClose: () => void;
}

/**
 * Panneau Diagnostics (SPEC §8.4) : tout ce qui est à signaler sur l'instance courante du moteur, en sections
 * Erreurs, Non supportés et Avertissements.
 */
export function DiagnosticsPanel({
  report,
  warnings,
  appError,
  pageNames,
  onFocus,
  onExport,
  onClose,
}: DiagnosticsPanelProps) {
  const entries = report?.entries ?? [];
  const errors = warnings.filter((w) => w.level === 'error');
  const others = warnings.filter((w) => w.level !== 'error');
  const errorCount = errors.length + (appError ? 1 : 0);

  return (
    <aside className="diagnostics" aria-label="Diagnostics">
      <header className="diagnostics-header">
        <CollapseButton />
        <h2>Diagnostics</h2>
        <button type="button" className="button" onClick={onExport} title="Télécharger le rapport du fichier courant">
          Exporter JSON
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>

      <div className="diagnostics-body">
        {!report && <p className="muted">Aucun fichier chargé.</p>}

        <h3>Erreurs ({errorCount})</h3>
        {errorCount === 0 ? (
          <p className="ok">Aucune erreur.</p>
        ) : (
          <ul className="warnings errors">
            {appError && <li>{appError}</li>}
            <WarningItems warnings={errors} pageNames={pageNames} onFocus={onFocus} />
          </ul>
        )}

        <h3>Non supportés ({entries.length})</h3>
        {report && (
          <p className="muted">
            {report.unsupportedElementCount} élément(s) sur {report.elementCount} avec un style non supporté.
          </p>
        )}
        {report && entries.length === 0 && <p className="ok">Tout est supporté.</p>}
        <ul className="entries">
          {entries.map((entry) => (
            <li key={`${entry.category}:${entry.name}`}>
              <details>
                <summary>
                  <span className="count">{entry.count}</span>
                  <code>{entry.name || '(vide)'}</code>
                  <span className="category">{CATEGORY_LABELS[entry.category]}</span>
                </summary>
                <div className="entry-detail">
                  <div className="muted">Pages : {entry.pages.join(', ')}</div>
                  <div className="muted">Exemple de style :</div>
                  <code className="style-sample">{entry.sampleStyle || '(aucun)'}</code>
                  <div className="muted">
                    Occurrences
                    {entry.occurrences.length < entry.count ? ` (${entry.occurrences.length} premières)` : ''} :
                  </div>
                  <ul className="occurrences">
                    {entry.occurrences.map((o) => (
                      <li key={`${o.pageId}/${o.elementId}`}>
                        <button type="button" className="link-button" onClick={() => onFocus(o.pageId, o.elementId)}>
                          {o.label.trim() || o.elementId}
                        </button>
                        <span className="muted"> · {o.pageName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>

        <h3>Avertissements ({others.length})</h3>
        {others.length === 0 ? (
          <p className="ok">Aucun avertissement.</p>
        ) : (
          <ul className="warnings">
            <WarningItems warnings={others} pageNames={pageNames} onFocus={onFocus} />
          </ul>
        )}
      </div>
    </aside>
  );
}

/** Avertissements (ou erreurs) d'une liste ; ceux qui visent un élément y mènent au clic. */
function WarningItems({
  warnings,
  pageNames,
  onFocus,
}: Pick<DiagnosticsPanelProps, 'warnings' | 'pageNames' | 'onFocus'>) {
  return warnings.map((w, i) => (
    <li key={i}>
      {w.pageId && w.cellId ? (
        <button type="button" className="link-button" onClick={() => onFocus(w.pageId!, w.cellId!)}>
          {w.message}
        </button>
      ) : (
        w.message
      )}
      {w.pageId && <span className="muted"> · {pageNames[w.pageId] ?? w.pageId}</span>}
    </li>
  ));
}
