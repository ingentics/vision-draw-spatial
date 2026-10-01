import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UnsupportedReport } from '../engine/diagnostics/unsupportedStyles';
import type { BackTarget, Engine, InitialView } from '../engine/Engine';
import type { ParentLink } from '../engine/interaction/history';
import type { DocumentModel } from '../engine/model/types';
import type { StoredFile } from '../engine/persistence/FileStore';
import { BackButton } from '../react/BackButton';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { clearLog, cumulativeEntries, exportJson, recordFile } from './diagnosticsLog';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { store } from './fileLibrary';
import { NavigationToolbar } from './NavigationToolbar';
import { SettingsPanel } from './SettingsPanel';
import type { Settings, SettingsPatch } from '../engine/settings';
import { GRAPH_PAGE_ID } from '../engine/graph/graphPage';

const FONTS = { regular: robotoRegular, bold: robotoBold };
/** SPEC §5.3 : état de consultation sauvegardé 500 ms après le dernier changement, et à la fermeture. */
const SAVE_DELAY_MS = 500;
interface ViewerProps {
  file: StoredFile;
  /** Retour au lanceur (l'état est sauvegardé avant). */
  onShowFiles: () => void;
  /** Paramètres (SPEC §13), partagés entre fichiers et persistés par l'appli. */
  settings: Settings;
  onSettingsChange: (patch: SettingsPatch) => void;
  onResetSettings: () => void;
}

/** Visionneuse d'un fichier : moteur, barre d'outils, onglets, diagnostics, persistance de la vue. */
export function Viewer({ file, onShowFiles, settings, onSettingsChange, onResetSettings }: ViewerProps) {
  const [engine, setEngine] = useState<Engine>();
  const [document, setDocument] = useState<DocumentModel>();
  const [pageId, setPageId] = useState<string>();
  const [error, setError] = useState<string>();
  const [rotationDeg, setRotationDeg] = useState(0);
  const [northDeg, setNorthDeg] = useState(0);
  const [viewMode, setViewMode] = useState<'top' | 'iso'>('top');
  const toggleMinimap = useCallback(
    () => onSettingsChange({ minimap: { visible: !settingsRef.current.minimap.visible } }),
    [onSettingsChange],
  );
  // Paramètres courants pour les rappels du moteur (créés une seule fois).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [report, setReport] = useState<UnsupportedReport>();
  const [cumulative, setCumulative] = useState(cumulativeEntries);
  /** Panneau latéral ouvert (un seul à la fois). */
  const [panel, setPanel] = useState<'diagnostics' | 'settings'>();
  const diagnosticsOpen = panel === 'diagnostics' && settings.debug.showUnsupportedPanel;
  const togglePanel = (name: 'diagnostics' | 'settings') => setPanel((open) => (open === name ? undefined : name));
  const [backTarget, setBackTarget] = useState<BackTarget>({ kind: 'none' });
  const [backChoices, setBackChoices] = useState<ParentLink[]>();

  // Vue mémorisée du fichier (SPEC §5.3), lue une seule fois au chargement.
  const initialView = useMemo<InitialView>(
    () => ({
      pageId: file.lastPageId,
      cameraByPage: file.cameraByPage,
      history: file.history,
      linkUsage: file.linkUsage,
    }),
    [file],
  );

  // --- Persistance de l'état de consultation -------------------------------
  const engineRef = useRef<Engine | undefined>(undefined);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    const instance = engineRef.current;
    if (!instance || instance.getFileId() !== file.id) return;
    void store.updateMeta(file.id, {
      lastPageId: instance.getCurrentPage()?.id,
      cameraByPage: instance.getPageCameras(),
      history: instance.getHistory(),
      linkUsage: instance.getLinkUsage(),
    });
  }, [file.id]);
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, SAVE_DELAY_MS);
  }, [save]);
  const flush = useCallback(() => {
    if (saveTimer.current) save();
  }, [save]);

  useEffect(() => {
    const onHide = () => {
      if (window.document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  const handleEngine = useCallback(
    (instance: Engine | undefined) => {
      engineRef.current = instance;
      setEngine(instance);
      // Accès au moteur depuis la console du navigateur, en dev uniquement.
      if (import.meta.env.DEV) (window as unknown as { engine?: Engine }).engine = instance;
      if (!instance) return;
      instance.on('load', (doc) => {
        setDocument(doc);
        setError(undefined);
        const unsupported = instance.getUnsupportedReport();
        setReport(unsupported);
        if (unsupported) {
          recordFile(file.id, file.name, unsupported);
          setCumulative(cumulativeEntries());
        }
      });
      const refreshBack = () => setBackTarget(instance.getBackTarget());
      instance.on('transitionEnd', refreshBack);
      instance.on('historyChange', () => {
        refreshBack();
        scheduleSave();
      });
      instance.on('linkUsed', scheduleSave);
      instance.on('backChoice', setBackChoices);
      instance.on('pageChange', (page) => {
        setPageId(page.id);
        setBackChoices(undefined);
        refreshBack();
        scheduleSave();
      });
      instance.on('cameraChange', (camera) => {
        // Arrondi au degré : pas de rendu React à chaque image tant que l'angle affiché ne change pas.
        // Écart à l'orientation de référence du mode (0° en dessus, orientation iso en iso).
        const deviation = camera.rotation - instance.getReferenceRotation();
        setRotationDeg(Math.round((Math.atan2(Math.sin(deviation), Math.cos(deviation)) * 180) / Math.PI) || 0);
        setNorthDeg(Math.round((camera.rotation * 180) / Math.PI) || 0);
        setViewMode(camera.mode);
        scheduleSave();
      });
    },
    [file.id, file.name, scheduleSave],
  );

  const warnings = document?.warnings ?? [];
  const issueCount = (report?.unsupportedElementCount ?? 0) + warnings.length;

  return (
    <div className="app">
      <header className="toolbar">
        <BackButton
          target={backTarget}
          onBack={() => (backChoices ? setBackChoices(undefined) : engine?.back())}
          choices={backChoices}
          onChoose={(id) => {
            setBackChoices(undefined);
            engine?.backTo(id);
          }}
          onDismiss={() => setBackChoices(undefined)}
        />
        <button
          type="button"
          className="button file-button"
          title="Revenir à la liste des fichiers"
          onClick={() => {
            flush();
            onShowFiles();
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 3.5h4l1.5 1.5h5.5v7.5h-11z" />
          </svg>
          <span className="file-name">{file.name}</span>
        </button>
        <NavigationToolbar
          viewMode={viewMode}
          onViewModeChange={(mode) => engine?.setViewMode(mode)}
          middleDrag={settings.controls.middleDrag}
          onMiddleDragChange={(middleDrag) => onSettingsChange({ controls: { middleDrag } })}
          rotationDeg={rotationDeg}
          northDeg={northDeg}
          onResetRotation={() => engine?.resetRotation()}
        />
        <div className="toolbar-end">
          {settings.debug.showUnsupportedPanel && (
            <button
              type="button"
              className="button diagnostics-toggle"
              aria-pressed={diagnosticsOpen}
              title="Éléments non supportés et avertissements de lecture"
              onClick={() => togglePanel('diagnostics')}
            >
              Diagnostics
              {issueCount > 0 && <span className="pill">{issueCount}</span>}
            </button>
          )}
          <button
            type="button"
            className="button"
            aria-pressed={panel === 'settings'}
            title="Paramètres"
            onClick={() => togglePanel('settings')}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 4.5h7M12.5 4.5h1M2.5 11.5h1M6.5 11.5h7" />
              <circle cx="11" cy="4.5" r="1.5" />
              <circle cx="5" cy="11.5" r="1.5" />
            </svg>
            Paramètres
          </button>
        </div>
        {error && <span className="badge error">{error}</span>}
      </header>

      <div className="viewport">
        <div className="canvas-area">
          <DrawioSpatial
            xml={file.content}
            fileId={file.id}
            fonts={FONTS}
            settings={settings}
            minimap={settings.minimap}
            onMinimapToggle={toggleMinimap}
            initialView={initialView}
            onEngine={handleEngine}
            onError={(e) => setError(e instanceof Error ? e.message : String(e))}
          />
        </div>
        {diagnosticsOpen && (
          <DiagnosticsPanel
            report={report}
            warnings={warnings}
            pageNames={Object.fromEntries((document?.pages ?? []).map((p) => [p.id, p.name]))}
            cumulative={cumulative}
            onFocus={(page, element) => engine?.focusElement(page, element)}
            onExport={() => exportJson(file.name, report, warnings)}
            onClearCumulative={() => {
              clearLog();
              setCumulative(cumulativeEntries());
            }}
            onClose={() => setPanel(undefined)}
          />
        )}
        {panel === 'settings' && (
          <SettingsPanel
            settings={settings}
            onChange={onSettingsChange}
            onReset={onResetSettings}
            onClose={() => setPanel(undefined)}
          />
        )}
      </div>

      {document && document.pages.length > 1 && (
        <nav className="tabs">
          <button
            className={pageId === GRAPH_PAGE_ID ? 'tab graph-tab active' : 'tab graph-tab'}
            title="Vue d’ensemble des pages et de leurs liens (touche G)"
            onClick={() => engine?.showGraph()}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4.5h3M9 11.5h3M5.5 6 10 10M4 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
            </svg>
            Vue graphe
          </button>
          {document.pages.map((page) => (
            <button
              key={page.id}
              className={page.id === pageId ? 'tab active' : 'tab'}
              onClick={() => engine?.goToPage(page.id)}
            >
              {page.name}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
