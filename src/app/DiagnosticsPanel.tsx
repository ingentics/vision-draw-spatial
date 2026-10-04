import { useState } from 'react';
import type { UnsupportedCategory, UnsupportedReport } from '../engine/diagnostics/unsupportedStyles';
import type { ParseWarning } from '../engine/model/types';
import type { CumulativeEntry } from './diagnosticsLog';
import { CollapseButton } from './Sidebar';

const CATEGORY_LABELS: Record<UnsupportedCategory, string> = {
  shape: 'Forme',
  edgeStyle: 'Tracé d’arête',
  startArrow: 'Pointe de départ',
  endArrow: 'Pointe d’arrivée',
};

interface DiagnosticsPanelProps {
  report: UnsupportedReport | undefined;
  warnings: ParseWarning[];
  pageNames: Record<string, string>;
  cumulative: { entries: CumulativeEntry[]; fileCount: number };
  onFocus: (pageId: string, elementId: string) => void;
  onExport: () => void;
  onClearCumulative: () => void;
  onClose: () => void;
}

/** Panneau debug (SPEC §8.4) : éléments non supportés du fichier, cumul tous fichiers, avertissements. */
export function DiagnosticsPanel({
  report,
  warnings,
  pageNames,
  cumulative,
  onFocus,
  onExport,
  onClearCumulative,
  onClose,
}: DiagnosticsPanelProps) {
  const [tab, setTab] = useState<'file' | 'all'>('file');
  const entries = report?.entries ?? [];

  return (
    <aside className="diagnostics" aria-label="Diagnostics">
      <header className="diagnostics-header">
        <CollapseButton />
        <h2>Diagnostics</h2>
        <button type="button" className="button" onClick={onExport} title="Télécharger le rapport (fichier + cumul)">
          Exporter JSON
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>

      <div className="button-group diagnostics-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="group-button"
          aria-pressed={tab === 'file'}
          aria-selected={tab === 'file'}
          onClick={() => setTab('file')}
        >
          Ce fichier ({entries.length})
        </button>
        <button
          type="button"
          role="tab"
          className="group-button"
          aria-pressed={tab === 'all'}
          aria-selected={tab === 'all'}
          onClick={() => setTab('all')}
        >
          Tous les fichiers ({cumulative.entries.length})
        </button>
      </div>

      {tab === 'file' ? (
        <div className="diagnostics-body">
          <p className="muted">
            {report
              ? `${report.unsupportedElementCount} élément(s) sur ${report.elementCount} avec un style non supporté.`
              : 'Aucun fichier chargé.'}
          </p>
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

          {warnings.length > 0 && (
            <>
              <h3>Avertissements de lecture ({warnings.length})</h3>
              <ul className="warnings">
                {warnings.map((w, i) => (
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
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div className="diagnostics-body">
          <p className="muted">
            Cumul des {cumulative.fileCount} fichier(s) ouvert(s) dans ce navigateur, par fréquence : le backlog des
            formes à implémenter.
          </p>
          {cumulative.entries.length === 0 ? (
            <p className="ok">Rien à signaler.</p>
          ) : (
            <table className="cumulative">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th className="num">Occ.</th>
                  <th className="num">Fichiers</th>
                </tr>
              </thead>
              <tbody>
                {cumulative.entries.map((e) => (
                  <tr key={`${e.category}:${e.name}`}>
                    <td>
                      <code>{e.name || '(vide)'}</code>
                    </td>
                    <td>{CATEGORY_LABELS[e.category]}</td>
                    <td className="num">{e.count}</td>
                    <td className="num">{e.files}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {cumulative.fileCount > 0 && (
            <button type="button" className="button" onClick={onClearCumulative}>
              Vider le cumul
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
