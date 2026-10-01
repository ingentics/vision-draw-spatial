import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UnsupportedReport } from '../engine/diagnostics/unsupportedStyles';
import type { BackTarget, Engine, InitialView } from '../engine/Engine';
import type { ControlSettings } from '../engine/interaction/controls';
import type { ParentLink } from '../engine/interaction/history';
import type { DocumentModel } from '../engine/model/types';
import type { StoredFile } from '../engine/persistence/FileStore';
import { BackButton } from '../react/BackButton';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { clearLog, cumulativeEntries, exportJson, recordFile } from './diagnosticsLog';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { store } from './fileLibrary';
import { IsoSettings } from './IsoSettings';
import { NavigationToolbar } from './NavigationToolbar';
import { readIsoPreferences, readMinimapVisible, writeIsoPreferences, writeMinimapVisible } from './viewPreferences';
import type { IsoPreferences } from './viewPreferences';
import { DEFAULT_VIEW } from '../engine/Engine';
import { GRAPH_PAGE_ID } from '../engine/graph/graphPage';

const FONTS = { regular: robotoRegular, bold: robotoBold };
/** SPEC §5.3 : état de consultation sauvegardé 500 ms après le dernier changement, et à la fermeture. */
const SAVE_DELAY_MS = 500;
const MIDDLE_DRAG_KEY = 'drawio-spatial:middle-drag';

/** Préférence du navigateur (en attendant le panneau de paramètres, étape 12). */
function readMiddleDrag(): ControlSettings['middleDrag'] {
  try {
    return localStorage.getItem(MIDDLE_DRAG_KEY) === 'rotate' ? 'rotate' : 'pan';
  } catch {
    return 'pan';
  }
}

function writeMiddleDrag(mode: ControlSettings['middleDrag']): void {
  try {
    localStorage.setItem(MIDDLE_DRAG_KEY, mode);
  } catch {
    // Stockage indisponible : le choix vaut pour la session seulement.
  }
}

interface ViewerProps {
  file: StoredFile;
  /** Retour au lanceur (l'état est sauvegardé avant). */
  onShowFiles: () => void;
}

/** Visionneuse d'un fichier : moteur, barre d'outils, onglets, diagnostics, persistance de la vue. */
export function Viewer({ file, onShowFiles }: ViewerProps) {
  const [engine, setEngine] = useState<Engine>();
  const [document, setDocument] = useState<DocumentModel>();
  const [pageId, setPageId] = useState<string>();
  const [error, setError] = useState<string>();
  const [middleDrag, setMiddleDrag] = useState(readMiddleDrag);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [northDeg, setNorthDeg] = useState(0);
  const [viewMode, setViewMode] = useState<'top' | 'iso'>('top');
  const [iso, setIso] = useState<IsoPreferences>(() => ({
    isoAngleDeg: DEFAULT_VIEW.isoAngleDeg,
    isoAzimuthDeg: DEFAULT_VIEW.isoAzimuthDeg,
    ...readIsoPreferences(),
  }));
  const [minimapVisible, setMinimapVisible] = useState(readMinimapVisible);
  const toggleMinimap = useCallback(() => {
    setMinimapVisible((visible) => {
      writeMinimapVisible(!visible);
      return !visible;
    });
  }, []);
  // Réglages lus à la création du moteur ; les changements suivants passent par setViewSettings.
  const [initialIso] = useState(iso);
  const changeIso = (patch: Partial<IsoPreferences>) => {
    const next = { ...iso, ...patch };
    setIso(next);
    writeIsoPreferences(next);
    engine?.setViewSettings(patch);
  };
  const [report, setReport] = useState<UnsupportedReport>();
  const [cumulative, setCumulative] = useState(cumulativeEntries);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
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

  useEffect(() => {
    engine?.setControls({ middleDrag });
  }, [engine, middleDrag]);

  const changeMiddleDrag = (mode: ControlSettings['middleDrag']) => {
    setMiddleDrag(mode);
    writeMiddleDrag(mode);
  };

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
          isoSettings={<IsoSettings value={iso} onChange={changeIso} />}
          middleDrag={middleDrag}
          onMiddleDragChange={changeMiddleDrag}
          rotationDeg={rotationDeg}
          northDeg={northDeg}
          onResetRotation={() => engine?.resetRotation()}
        />
        <button
          type="button"
          className="button diagnostics-toggle"
          aria-pressed={diagnosticsOpen}
          title="Éléments non supportés et avertissements de lecture"
          onClick={() => setDiagnosticsOpen((open) => !open)}
        >
          Diagnostics
          {issueCount > 0 && <span className="pill">{issueCount}</span>}
        </button>
        {error && <span className="badge error">{error}</span>}
      </header>

      <div className="viewport">
        <div className="canvas-area">
          <DrawioSpatial
            xml={file.content}
            fileId={file.id}
            fonts={FONTS}
            view={initialIso}
            minimap={{ visible: minimapVisible }}
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
            onClose={() => setDiagnosticsOpen(false)}
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
