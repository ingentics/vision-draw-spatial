import { useEffect, useState } from 'react';
import type { EngineMetrics, ParseWarning, UnsupportedCategory, UnsupportedReport } from '../engine';
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
  /** Métriques du moteur (sujet 298) et mesure des images rendues, active tant que le panneau est ouvert. */
  getMetrics: () => EngineMetrics | undefined;
  setFrameSampling: (on: boolean) => void;
  onFocus: (pageId: string, elementId: string) => void;
  onExport: () => void;
  onClose: () => void;
}

/**
 * Panneau Diagnostics (SPEC §8.4) : tout ce qui est à signaler sur l'instance courante du moteur, en sections
 * Erreurs, Non supportés, Avertissements et Métriques.
 */
export function DiagnosticsPanel({
  report,
  warnings,
  appError,
  pageNames,
  getMetrics,
  setFrameSampling,
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

        <MetricsSection getMetrics={getMetrics} setFrameSampling={setFrameSampling} />
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

/** Rafraîchissement des métriques affichées. */
const METRICS_REFRESH_MS = 1000;

const ms = (value: number | undefined) => (value === undefined ? '—' : `${value.toFixed(1)} ms`);

/** Métriques de l'instance courante, relues chaque seconde ; la mesure des images ne tourne que section affichée. */
function MetricsSection({
  getMetrics,
  setFrameSampling,
}: Pick<DiagnosticsPanelProps, 'getMetrics' | 'setFrameSampling'>) {
  const [metrics, setMetrics] = useState(getMetrics);
  useEffect(() => {
    setFrameSampling(true);
    const timer = setInterval(() => setMetrics(getMetrics()), METRICS_REFRESH_MS);
    return () => {
      clearInterval(timer);
      setFrameSampling(false);
    };
  }, [getMetrics, setFrameSampling]);
  if (!metrics) return null;
  const { frames } = metrics;
  const rows: [string, string, string?][] = [
    ['Images / s', frames ? frames.fps.toFixed(1) : '—', 'Rendu à la demande : 0 au repos'],
    ['Durée d’image (moyenne)', ms(frames?.averageMs)],
    ['Durée d’image (pire)', ms(frames?.worstMs)],
    ['Lecture du fichier', ms(metrics.readMs), 'Décodage et parsing'],
    ['Construction de la scène', ms(metrics.sceneBuildMs), 'Dernière construction de la page courante'],
    ['Cellules', String(metrics.cells), 'Formes et flèches de toutes les pages'],
    ['Objets de la scène', String(metrics.sceneObjects)],
    ['Draw calls', String(metrics.drawCalls), 'Dernière image'],
    ['Géométries', String(metrics.geometries), 'En mémoire GPU'],
    ['Textures', String(metrics.textures), 'En mémoire GPU'],
  ];
  return (
    <>
      <h3>Métriques</h3>
      <table className="metrics">
        <tbody>
          {rows.map(([label, value, hint]) => (
            <tr key={label} title={hint}>
              <th>{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
