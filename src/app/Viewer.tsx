import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UnsupportedReport } from '../engine/diagnostics/unsupportedStyles';
import type { BackTarget, Engine, InitialView, LabelEditRequest, Selection } from '../engine/Engine';
import type { ParentLink } from '../engine/interaction/history';
import type { DocumentModel } from '../engine/model/types';
import type { StoredFile } from '../engine/persistence/FileStore';
import { BackButton } from '../react/BackButton';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { clearLog, cumulativeEntries, exportJson, recordFile } from './diagnosticsLog';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { desktop } from './desktop';
import { isFilePath } from '../engine/persistence/FsStore';
import { saveAs, store } from './fileLibrary';
import { NavigationToolbar } from './NavigationToolbar';
import { LabelEditor } from './LabelEditor';
import { PageTabs } from './PageTabs';
import { SelectionBar } from './SelectionBar';
import { Palette, PALETTE_MIME, templateById } from './Palette';
import { SettingsPanel } from './SettingsPanel';
import type { Settings, SettingsPatch } from '../engine/settings';
import { GRAPH_PAGE_ID } from '../engine/graph/graphPage';

const FONTS = { regular: robotoRegular, bold: robotoBold };
/** Réglages iso qu'une page peut imposer (état de vue enregistré dans le fichier). */
const ISO_KEYS = ['isoAngleDeg', 'isoAzimuthDeg', 'isoVolume', 'isoDepth'] as const;
/** SPEC §5.3 : état de consultation sauvegardé 500 ms après le dernier changement, et à la fermeture. */
const SAVE_DELAY_MS = 500;
interface ViewerProps {
  file: StoredFile;
  /** Retour au lanceur (l'état est sauvegardé avant). */
  onShowFiles: () => void;
  /** Appli native : « Enregistrer sous » a créé un vrai fichier, à afficher à la place. */
  onFileReplaced?: (file: StoredFile) => void;
  /** Paramètres (SPEC §13), partagés entre fichiers et persistés par l'appli. */
  settings: Settings;
  onSettingsChange: (patch: SettingsPatch) => void;
  onResetSettings: () => void;
}

/** Visionneuse d'un fichier : moteur, barre d'outils, onglets, diagnostics, persistance de la vue. */
export function Viewer({
  file,
  onShowFiles,
  onFileReplaced,
  settings,
  onSettingsChange,
  onResetSettings,
}: ViewerProps) {
  const [engine, setEngine] = useState<Engine>();
  const [document, setDocument] = useState<DocumentModel>();
  const [pageId, setPageId] = useState<string>();
  const [error, setError] = useState<string>();
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
  const [modified, setModified] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<number>();
  const [undoLabels, setUndoLabels] = useState<{ undo?: string; redo?: string }>({});
  const [selection, setSelection] = useState<Selection>();
  const [labelEdit, setLabelEdit] = useState<LabelEditRequest>();
  const modifiedRef = useRef(false);
  modifiedRef.current = modified;

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

  /**
   * Sauvegarde (SPEC §14.1) : XML réécrit en place par le moteur (avec l'état de vue des pages),
   * téléchargé sous le nom du fichier et enregistré dans la bibliothèque.
   */
  /**
   * Enregistre le XML sauvegardé : navigateur → bibliothèque, et téléchargement si demandé ;
   * appli native → le vrai fichier (un exemple embarqué : « Enregistrer sous » si demandé,
   * sinon sa copie dans la bibliothèque).
   */
  const persist = useCallback(
    (xml: string, auto: boolean) => {
      save();
      const report = (cause: unknown) =>
        setError(`Sauvegarde impossible : ${cause instanceof Error ? cause.message : String(cause)}`);
      if (desktop && !isFilePath(file.id) && !auto) {
        void saveAs(xml, file.name).then((saved) => saved && onFileReplaced?.(saved));
        return;
      }
      if (!desktop && !auto) download(file.name.split('/').pop() || 'diagram.drawio', xml);
      store.updateMeta(file.id, { content: xml, size: xml.length }).then(() => {
        setError(undefined);
        if (auto) setAutosavedAt(Date.now());
      }, report);
    },
    [file.id, file.name, save, onFileReplaced],
  );

  /** Sauvegarde demandée (bouton, Ctrl+S hors du canvas). */
  const saveFile = useCallback(() => {
    const instance = engineRef.current;
    if (!instance || instance.getFileId() !== file.id) return;
    const xml = instance.serialize();
    if (xml !== undefined) persist(xml, false);
  }, [file.id, persist]);

  // Ctrl+S / ⌘S : sauvegarde (plutôt que l'enregistrement de la page par le navigateur).
  // Ctrl+Z annule, Ctrl+Maj+Z ou Ctrl+Y rétablit (hors saisie dans un champ).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        saveFile();
        return;
      }
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
      if (typing || (key !== 'z' && key !== 'y')) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) engineRef.current?.redo();
      else engineRef.current?.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveFile]);

  // Modifications non sauvegardées : le navigateur demande confirmation avant de quitter.
  useEffect(() => {
    if (!modified) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [modified]);

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
      instance.on('modifiedChange', setModified);
      instance.on('undoChange', (undo, redo) => setUndoLabels({ undo, redo }));
      instance.on('selectionChange', setSelection);
      instance.on('labelEdit', setLabelEdit);
      instance.on('documentChange', (doc) => {
        setDocument(doc);
        setReport(instance.getUnsupportedReport());
      });
      // Une page peut imposer ses réglages iso (état de vue du fichier) : l'appli les reprend.
      instance.on('settingsChange', (next) => {
        const current = settingsRef.current.view;
        if (ISO_KEYS.some((key) => next.view[key] !== current[key])) {
          onSettingsChange({ view: Object.fromEntries(ISO_KEYS.map((key) => [key, next.view[key]])) });
        }
      });
      instance.on('pageChange', (page) => {
        setPageId(page.id);
        setBackChoices(undefined);
        refreshBack();
        scheduleSave();
      });
      instance.on('cameraChange', (camera) => {
        // Arrondi au degré : pas de rendu React à chaque image tant que l'angle affiché ne change pas.
        setViewMode(camera.mode);
        scheduleSave();
      });
    },
    [file.id, file.name, scheduleSave, onSettingsChange],
  );

  const warnings = document?.warnings ?? [];
  const editablePages = document !== undefined && engine?.canEditPages() === true;
  const canAddShapes = pageId !== undefined && pageId !== GRAPH_PAGE_ID;
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
            if (modifiedRef.current && !window.confirm('Quitter sans sauvegarder les modifications ?')) return;
            flush();
            onShowFiles();
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 3.5h4l1.5 1.5h5.5v7.5h-11z" />
          </svg>
          <span className="file-name">{file.name}</span>
        </button>
        <button
          type="button"
          className={modified ? 'button save-button modified' : 'button save-button'}
          title={[
            desktop ? 'Sauvegarder le fichier (Ctrl+S)' : 'Sauvegarder (Ctrl+S) : téléchargement et bibliothèque',
            modified ? 'modifications non sauvegardées' : undefined,
            autosavedAt
              ? `enregistré automatiquement à ${new Date(autosavedAt).toLocaleTimeString('fr-FR')}`
              : settings.save.autosave
                ? 'sauvegarde automatique activée'
                : undefined,
          ]
            .filter(Boolean)
            .join(' — ')}
          onClick={saveFile}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 2.5v7M5 6.5l3 3 3-3M3 11v2.5h10V11" />
          </svg>
          Sauvegarder
          {modified && <span className="modified-dot" aria-label="modifications non sauvegardées" />}
        </button>
        <span className="button-group">
          <button
            type="button"
            className="button icon-button"
            disabled={!undoLabels.undo}
            title={undoLabels.undo ? `Annuler : ${undoLabels.undo} (Ctrl+Z)` : 'Annuler (Ctrl+Z)'}
            aria-label="Annuler"
            onClick={() => engine?.undo()}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2" />
            </svg>
          </button>
          <button
            type="button"
            className="button icon-button"
            disabled={!undoLabels.redo}
            title={undoLabels.redo ? `Rétablir : ${undoLabels.redo} (Ctrl+Maj+Z)` : 'Rétablir (Ctrl+Maj+Z)'}
            aria-label="Rétablir"
            onClick={() => engine?.redo()}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2" />
            </svg>
          </button>
        </span>
        <NavigationToolbar
          viewMode={viewMode}
          onViewModeChange={(mode) => engine?.setViewMode(mode)}
          middleDrag={settings.controls.middleDrag}
          onMiddleDragChange={(middleDrag) => onSettingsChange({ controls: { middleDrag } })}
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
        <Palette disabled={!canAddShapes} onAdd={(template) => engine?.addShape(template)} />
        <div
          className="canvas-area"
          onDragOver={(event) => {
            if (!canAddShapes || !event.dataTransfer.types.includes(PALETTE_MIME)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(event) => {
            const template = templateById(event.dataTransfer.getData(PALETTE_MIME));
            if (!template || !engine) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            engine.addShape(template, { x: event.clientX - rect.left, y: event.clientY - rect.top });
            engine.focusCanvas();
          }}
        >
          {labelEdit && (
            <LabelEditor
              key={`${labelEdit.pageId}:${labelEdit.elementId}`}
              request={labelEdit}
              onCommit={(text) => {
                setLabelEdit(undefined);
                engine?.setLabel(labelEdit.elementId, text);
                engine?.focusCanvas();
              }}
              onCancel={() => {
                setLabelEdit(undefined);
                engine?.focusCanvas();
              }}
            />
          )}
          {selection && document && selection.pageId === pageId && pageId !== GRAPH_PAGE_ID && !labelEdit && (
            <SelectionBar
              selection={selection}
              pages={document.pages}
              onLink={(link) => engine?.setLink(selection.picked.element.id, link)}
              onSpatial={(key, value) => engine?.setSpatial(selection.picked.element.id, key, value)}
              defaultDepth={settings.view.isoDepth}
              onEditLabel={() => engine?.editLabel(selection.picked.element.id)}
              onDelete={() => engine?.deleteSelection()}
            />
          )}
          <DrawioSpatial
            xml={file.content}
            fileId={file.id}
            editable
            fonts={FONTS}
            settings={settings}
            minimap={settings.minimap}
            onMinimapToggle={toggleMinimap}
            initialView={initialView}
            autosave={settings.save.autosave}
            autosaveDelayMs={settings.save.delayMs}
            onSave={(xml, { auto }) => persist(xml, auto)}
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

      {document && (
        <PageTabs
          pages={document.pages}
          currentPageId={pageId}
          graphActive={pageId === GRAPH_PAGE_ID}
          onShowGraph={() => engine?.showGraph()}
          onSelect={(id) => engine?.goToPage(id)}
          onAdd={editablePages ? () => engine?.addPage() : undefined}
          onRename={editablePages ? (id, name) => engine?.renamePage(id, name) : undefined}
          onRemove={editablePages ? (id) => engine?.removePage(id) : undefined}
        />
      )}
    </div>
  );
}

/** Propose le fichier au téléchargement (sous son nom d'origine). */
function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/xml' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
