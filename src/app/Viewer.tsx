import robotoBoldItalic from '@fontsource/roboto/files/roboto-latin-700-italic.woff?url';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import robotoMonoBold from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url';
import robotoMono from '@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UnsupportedReport } from '../engine/diagnostics/unsupportedStyles';
import type { BackTarget, Engine, InitialView, LabelEditRequest, ModeHint, Selection } from '../engine/Engine';
import type { ViewMode } from '../engine/interaction/camera';
import type { ParentLink } from '../engine/interaction/history';
import type { DocumentModel, EdgeModel, ShapeModel } from '../engine/model/types';
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
import type { RichEditorHandle, SelectionFormat } from './LabelEditor';
import { wholeTextChange } from './TextFormat';
import type { TextAction } from './TextFormat';
import { PageTabs } from './PageTabs';
import { MULTI_SELECT_LABELS } from './SettingsPanel';
import { Palette, PALETTE_MIME, templateById } from './Palette';
import { SettingsPanel } from './SettingsPanel';
import { ContextPanel, contextTitle } from './ContextPanel';
import { Sidebar } from './Sidebar';
import type { Settings, SettingsPatch } from '../engine/settings';
import { GRAPH_PAGE_ID } from '../engine/graph/graphPage';
import { labelPlacePatch } from '../engine/edit/labelPosition';
import { usedTemplates } from '../engine/edit/palette';

const FONTS = {
  regular: robotoRegular,
  bold: robotoBold,
  italic: robotoItalic,
  boldItalic: robotoBoldItalic,
  mono: robotoMono,
  monoBold: robotoMonoBold,
};
/** Aide de la barre du bas : mode en cours tant qu'une touche est maintenue. */
const MODE_HINT_LABELS: Record<ModeHint, string> = {
  navigation: 'Mode navigation',
  multiSelect: 'Mode sélection multiple',
};

/** Réglages iso qu'une page peut imposer (état de vue enregistré dans le fichier). */
const ISO_KEYS = ['isoAngleDeg', 'isoAzimuthDeg', 'isoVolume', 'isoDepth'] as const;
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
  const [viewMode, setViewMode] = useState<ViewMode>('top');
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
  /** Paramètres ou diagnostics ; sinon le panneau contextuel (page, forme, flèche) est affiché. */
  const [panel, setPanel] = useState<'diagnostics' | 'settings'>();
  const diagnosticsOpen = panel === 'diagnostics' && settings.debug.showUnsupportedPanel;
  const togglePanel = (name: 'diagnostics' | 'settings') => {
    // Barre de droite repliée : on a demandé ce panneau, elle se rouvre dessus.
    if (settings.panels.right.collapsed) {
      onSettingsChange({ panels: { right: { collapsed: false } } });
      setPanel(name);
    } else setPanel((open) => (open === name ? undefined : name));
  };
  const [backTarget, setBackTarget] = useState<BackTarget>({ kind: 'none' });
  const [backChoices, setBackChoices] = useState<ParentLink[]>();
  const [modified, setModified] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<number>();
  const [undoLabels, setUndoLabels] = useState<{ undo?: string; redo?: string }>({});
  const [selection, setSelection] = useState<Selection>();
  const [modeHint, setModeHint] = useState<ModeHint>();
  const [labelEdit, setLabelEdit] = useState<LabelEditRequest>();
  /** Éditeur de texte en place (commandes du panneau de format) et format de sa sélection. */
  const editorHandle = useRef<RichEditorHandle | undefined>(undefined);
  const [selectionFormat, setSelectionFormat] = useState<SelectionFormat>();
  /** Taille obtenue par « Ajuster » dans le texte en cours d'édition (panneau de format). */
  const [fittedSize, setFittedSize] = useState<number>();
  const modifiedRef = useRef(false);
  modifiedRef.current = modified;

  // Sélection de la page courante, objet du panneau contextuel.
  const selected = useMemo(() => {
    const items = selection && selection.pageId === pageId && pageId !== GRAPH_PAGE_ID ? selection.items : [];
    return {
      shapes: items.filter((item) => item.type === 'shape').map((item) => item.element as ShapeModel),
      edges: items.filter((item) => item.type === 'edge').map((item) => item.element as EdgeModel),
    };
  }, [selection, pageId]);
  // Choisir un élément ramène le panneau contextuel (paramètres ou diagnostics fermés).
  const selectedKey = [...selected.shapes, ...selected.edges].map((element) => element.id).join('\n');
  useEffect(() => {
    if (selectedKey) setPanel(undefined);
  }, [selectedKey]);

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
    // SPEC §5.3 : état de consultation sauvegardé peu après le dernier changement, et à la fermeture.
    saveTimer.current = setTimeout(save, settingsRef.current.save.viewStateDelayMs);
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
  // Ctrl+Z annule, Ctrl+Maj+Z ou Ctrl+Y rétablit, Ctrl+D duplique (hors saisie dans un champ).
  useEffect(() => {
    // Raccourci presse-papier en attente de son événement natif (`copy`, `cut`, `paste`).
    let pending: 'c' | 'x' | 'v' | undefined;
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
      if (typing) return;
      if (key === 'd' && !event.shiftKey) {
        event.preventDefault();
        engineRef.current?.duplicateSelection();
        return;
      }
      if ((key === 'c' || key === 'x' || key === 'v') && !event.shiftKey && !window.getSelection()?.toString()) {
        // Repli si le navigateur n'émet pas l'événement natif hors d'un champ : presse-papier
        // interne (et écriture asynchrone dans celui du système, si elle est permise).
        pending = key;
        window.setTimeout(() => {
          if (pending !== key) return;
          pending = undefined;
          const engine = engineRef.current;
          if (key === 'v') {
            engine?.paste();
            return;
          }
          const xml = key === 'x' ? engine?.cutSelection() : engine?.copySelection();
          if (xml !== undefined) navigator.clipboard?.writeText(xml).catch(() => undefined);
        }, 50);
        return;
      }
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) engineRef.current?.redo();
      else engineRef.current?.undo();
    };
    // Copier / couper / coller (ticket 59) : presse-papier système au format draw.io, sauf dans un
    // champ ou sur un texte sélectionné dans l'interface (copie native du navigateur).
    const nativeClipboard = (event: ClipboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
      return typing || !!window.getSelection()?.toString();
    };
    const onCopy = (event: ClipboardEvent) => {
      pending = undefined;
      if (nativeClipboard(event)) return;
      const engine = engineRef.current;
      const xml = event.type === 'cut' ? engine?.cutSelection() : engine?.copySelection();
      if (xml === undefined) return;
      event.clipboardData?.setData('text/plain', xml);
      event.preventDefault();
    };
    const onPaste = (event: ClipboardEvent) => {
      pending = undefined;
      if (nativeClipboard(event)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (engineRef.current?.paste(text || undefined)) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('copy', onCopy);
    window.addEventListener('cut', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCopy);
      window.removeEventListener('paste', onPaste);
    };
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
      instance.on('modeHint', setModeHint);
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
  // Formes de la page courante, pour la catégorie « Utilisées » de la palette.
  const usedShapes = useMemo(
    () => (canAddShapes ? usedTemplates(document?.pages.find((page) => page.id === pageId)) : []),
    [canAddShapes, document, pageId],
  );
  const issueCount = (report?.unsupportedElementCount ?? 0) + warnings.length;
  /**
   * Format du texte en cours d'édition en place (panneau latéral, Ctrl+B / I / U) : sur la sélection
   * dans le texte (mise en forme partielle, écrite à la validation), sinon sur tout le texte (clés du
   * style de la cellule, et les mises en forme partielles de même nature sont retirées).
   */
  const formatText = (action: TextAction) => {
    const editor = editorHandle.current;
    const cellId = labelEdit?.styleCellId;
    if (action.type === 'align') {
      if (cellId) engine?.setTextFormat(cellId, { [action.key]: action.value });
      return;
    }
    if (action.type === 'place') {
      if (cellId) engine?.setTextFormat(cellId, labelPlacePatch(action.place));
      return;
    }
    if (action.type === 'fit') {
      if (cellId) engine?.setTextFormat(cellId, { fitText: action.on ? '1' : undefined });
      return;
    }
    if (editor?.hasSelection()) {
      if (action.type === 'toggle') editor.toggle(action.mark);
      else if (action.type === 'size') editor.setMarks({ fontSize: action.size });
      else if (action.type === 'color') editor.setMarks({ color: action.color ?? null });
      else
        editor.setMarks({
          fontSize: action.preset.fontSize,
          color: action.preset.fontColor ?? null,
          fontFamily: action.preset.fontFamily ?? null,
        });
      return;
    }
    if (!cellId || !labelEdit) return;
    const { patch, clear } = wholeTextChange(action, labelEdit.style);
    editor?.clear(clear);
    engine?.setTextFormat(cellId, patch);
  };
  // Page affichée (pas la vue graphe) : le panneau contextuel est toujours ouvert dessus.
  const currentPage = pageId !== GRAPH_PAGE_ID ? document?.pages.find((page) => page.id === pageId) : undefined;
  // Titre de la barre de droite (et de sa bande quand elle est repliée) ; pas de panneau, pas de barre.
  const rightTitle = diagnosticsOpen
    ? 'Diagnostics'
    : panel === 'settings'
      ? 'Paramètres'
      : currentPage && contextTitle(selected.shapes, selected.edges, labelEdit !== undefined);

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
          onResetView={() => engine?.resetView()}
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
        <Sidebar
          side="left"
          label="Formes"
          layout={settings.panels.left}
          stripText={settings.panels.stripText}
          onChange={(left) => onSettingsChange({ panels: { left } })}
        >
          <Palette disabled={!canAddShapes} used={usedShapes} onAdd={(template) => engine?.addShape(template)} />
        </Sidebar>
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
              key={`${labelEdit.pageId}:${labelEdit.elementId}:${labelEdit.end ?? ''}`}
              request={labelEdit}
              handle={editorHandle}
              onMoveText={
                labelEdit.onEdge && labelEdit.styleCellId ? (screen) => engine?.moveEditedText(screen) : undefined
              }
              onMoveTextEnd={() => engine?.endEditedTextMove()}
              onFlip={() => engine?.flipEditedText()}
              onToggle={(mark) => formatText({ type: 'toggle', mark })}
              onSelectionFormat={setSelectionFormat}
              onFitSize={setFittedSize}
              onCommit={({ text, html }) => {
                setLabelEdit(undefined);
                engine?.closeLabelEdit();
                if (labelEdit.labelCellId) engine?.setEdgeText(labelEdit.elementId, labelEdit.labelCellId, text, html);
                else if (labelEdit.end)
                  engine?.setEdgeEndLabel(labelEdit.elementId, labelEdit.end, text, html, labelEdit.flipped);
                else engine?.setLabel(labelEdit.elementId, text, html);
                engine?.focusCanvas();
              }}
              onCancel={() => {
                setLabelEdit(undefined);
                engine?.closeLabelEdit();
                engine?.focusCanvas();
              }}
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
        {rightTitle && (
          <Sidebar
            side="right"
            label={rightTitle}
            layout={settings.panels.right}
            stripText={settings.panels.stripText}
            onChange={(right) => onSettingsChange({ panels: { right } })}
          >
            {diagnosticsOpen ? (
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
            ) : panel === 'settings' ? (
              <SettingsPanel
                settings={settings}
                onChange={onSettingsChange}
                onReset={onResetSettings}
                onResetOrientation={() => engine?.resetRotation()}
                onClose={() => setPanel(undefined)}
              />
            ) : (
              currentPage && (
                <ContextPanel
                  page={currentPage}
                  pages={document?.pages ?? []}
                  shapes={selected.shapes}
                  edges={selected.edges}
                  styles={settings.styles}
                  defaultDepth={settings.view.isoDepth}
                  multiSelectKey={MULTI_SELECT_LABELS[settings.controls.multiSelectKey]}
                  onLink={(link) => selection && engine?.setLink(selection.picked.element.id, link)}
                  onSpatial={(key, value) => selection && engine?.setSpatial(selection.picked.element.id, key, value)}
                  onEditLabel={() => selection && engine?.editLabel(selection.picked.element.id)}
                  onEndLabel={(end, text) =>
                    selection && engine?.setEdgeEndLabel(selection.picked.element.id, end, text)
                  }
                  onDelete={() => engine?.deleteSelection()}
                  onResetRoute={() => selection && engine?.resetEdgeRoute(selection.picked.element.id)}
                  onEdgeStyle={(patch) =>
                    engine?.setElementsStyle(
                      selected.edges.map((edge) => edge.id),
                      patch,
                      'Tracé',
                    )
                  }
                  onShapeStyle={(patch) =>
                    engine?.setElementsStyle(
                      selected.shapes.map((shape) => shape.id),
                      patch,
                      'Bordure',
                    )
                  }
                  onTextAnchor={(cellId, anchor) =>
                    selection && engine?.setEdgeTextAnchor(selection.picked.element.id, cellId, anchor)
                  }
                  textEdit={
                    labelEdit && {
                      style: labelEdit.style,
                      selection: selectionFormat,
                      canFormat: labelEdit.styleCellId !== undefined,
                      onEdge: labelEdit.onEdge,
                      fittedSize,
                      presets: settings.styles.text,
                      onAction: formatText,
                      onOwner: () => editorHandle.current?.commit(),
                    }
                  }
                  onApplyStyle={(preset) =>
                    engine?.applyStylePreset(
                      selected.shapes.map((shape) => shape.id),
                      preset,
                      [...settings.styles.base, ...settings.styles.extended],
                    )
                  }
                  onRenamePage={editablePages ? (name) => engine?.renamePage(currentPage.id, name) : undefined}
                  onPageMode={editablePages ? (modeId) => engine?.setPageMode(currentPage.id, modeId) : undefined}
                  onModeEdit={editablePages ? (label, edit) => engine?.editPageMode(label, edit) : undefined}
                  onModeProperty={
                    editablePages
                      ? (scope, targetId, key, value) => engine?.setModeProperty(scope, targetId, key, value)
                      : undefined
                  }
                />
              )
            )}
          </Sidebar>
        )}
      </div>

      {document && (
        <footer className="bottom-bar">
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
          {/* Aide : mode en cours tant qu'une touche de modification est maintenue (rien sinon). */}
          <span className="mode-hint" role="status">
            {modeHint && MODE_HINT_LABELS[modeHint]}
          </span>
        </footer>
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
