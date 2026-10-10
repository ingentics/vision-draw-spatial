import robotoBoldItalic from '@fontsource/roboto/files/roboto-latin-700-italic.woff?url';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import robotoMonoBold from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url';
import robotoMono from '@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GRAPH_PAGE_ID } from '../engine';
import type {
  EdgeModel,
  Engine,
  ImageExportOptions,
  InitialView,
  ModeHint,
  Settings,
  SettingsPatch,
  ShapeModel,
  StoredFile,
} from '../engine';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { exportJson } from './diagnosticsExport';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { baseName, downloadBlob } from './download';
import { ExportPanel } from './export/ExportPanel';
import { SlidingModeBar } from './ModeBar';
import { PageTabs } from './PageTabs';
import { ParentPagesBar } from './ParentPagesBar';
import { Palette, PALETTE_MIME } from './Palette';
import { PluginsContext } from './pluginsContext';
import type { AppPlugins } from './pluginsContext';
import { SettingsPanel } from './SettingsPanel';
import { contextTitle } from './ContextPanel';
import { modePanel } from './plugins/modes/registry';
import type { ModePageControls } from './plugins/modes/registry';
import { Sidebar } from './Sidebar';
import { ViewerComment, ViewerLabelEditor, useInPlaceText } from './viewer/inPlaceText';
import { useEditShortcuts } from './viewer/useEditShortcuts';
import { useEngineEvents } from './viewer/useEngineEvents';
import { useFileSaving } from './viewer/useFileSaving';
import { ViewerContextPanel } from './viewer/ViewerContextPanel';
import { ViewerToolbar } from './viewer/ViewerToolbar';

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
  const [error, setError] = useState<string>();
  // Paramètres courants pour les rappels du moteur (créés une seule fois).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const toggleMinimap = useCallback(
    () => onSettingsChange({ minimap: { visible: !settingsRef.current.minimap.visible } }),
    [onSettingsChange],
  );
  const toggleMinigraph = useCallback(
    () => onSettingsChange({ minigraph: { visible: !settingsRef.current.minigraph.visible } }),
    [onSettingsChange],
  );
  /**
   * Diagnostics ou export d'image dans la barre de droite ; sinon le panneau contextuel (page, forme, flèche) est
   * affiché.
   */
  const [panel, setPanel] = useState<'diagnostics' | 'export'>();
  const diagnosticsOpen = panel === 'diagnostics' && settings.debug.showUnsupportedPanel;
  const togglePanel = (name: 'diagnostics' | 'export') => {
    // Barre de droite repliée : on a demandé ce panneau, elle se rouvre dessus.
    if (settings.panels.right.collapsed) {
      onSettingsChange({ panels: { right: { collapsed: false } } });
      setPanel(name);
    } else setPanel((open) => (open === name ? undefined : name));
  };
  /** Paramètres : fenêtre modale au-dessus de l'appli. */
  const [settingsOpen, setSettingsOpen] = useState(false);

  const engineRef = useRef<Engine | undefined>(undefined);
  const saving = useFileSaving({ file, engineRef, settingsRef, onFileReplaced, setError });
  const { flush, persist, saveFile } = saving;
  const events = useEngineEvents({
    engineRef,
    settingsRef,
    scheduleSave: saving.scheduleSave,
    onSettingsChange,
    setError,
  });
  const { engine, document, pageId, selection, labelEdit, commentEdit, graphSlide, modeHint, backChoosing } = events;
  const { setBackChoosing, transitioning } = events;
  const dismissBackChoice = useCallback(() => setBackChoosing(false), [setBackChoosing]);
  const text = useInPlaceText({ engine, labelEdit, commentEdit, settings });
  useEditShortcuts(engineRef, saveFile);
  const modifiedRef = useRef(false);
  modifiedRef.current = events.modified;

  // Sélection de la page courante, objet du panneau contextuel.
  const selected = useMemo(() => {
    const items = selection && selection.pageId === pageId && pageId !== GRAPH_PAGE_ID ? selection.items : [];
    return {
      shapes: items.filter((item) => item.type === 'shape').map((item) => item.element as ShapeModel),
      edges: items.filter((item) => item.type === 'edge').map((item) => item.element as EdgeModel),
    };
  }, [selection, pageId]);
  // Choisir un élément ramène le panneau contextuel (diagnostics fermés) ; l'export reste ouvert, il porte sur elle.
  const selectedKey = [...selected.shapes, ...selected.edges].map((element) => element.id).join('\n');
  useEffect(() => {
    if (selectedKey) setPanel((open) => (open === 'export' ? open : undefined));
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

  // Modifications non sauvegardées : le navigateur demande confirmation avant de quitter.
  useEffect(() => {
    if (!events.modified) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [events.modified]);

  const warnings = document?.warnings ?? [];
  /** Barre du courant du mode de la page (ex. flux courant), en haut de la zone de dessin. */
  const modeIndicator = pageId !== undefined ? engine?.getModeIndicator(pageId) : undefined;
  /** Édition verrouillée par un mode (sujet 467) : rien ne se modifie, la palette et les réglages de page sont grisés. */
  const editLocked = events.editLock !== undefined;
  const editablePages = document !== undefined && engine?.canEditPages() === true && !editLocked;
  const canAddShapes = pageId !== undefined && pageId !== GRAPH_PAGE_ID;
  const shownPage = document?.pages.find((page) => page.id === pageId);
  // Page affichée (pas la vue graphe) : le panneau contextuel est toujours ouvert dessus, la palette la suit. Pendant
  // une plongée depuis la vue graphe, les barres sont déjà celles de la page d'arrivée.
  const panelsPageId = graphSlide?.pageId ?? pageId;
  const currentPage =
    panelsPageId !== GRAPH_PAGE_ID ? document?.pages.find((page) => page.id === panelsPageId) : undefined;
  // Formes de la page courante, pour la catégorie « Utilisées » de la palette.
  const usedShapes = useMemo(
    () => (currentPage && engine ? engine.usedTemplates(currentPage) : []),
    [currentPage, engine],
  );
  // Plugins du moteur (sujet 290) : registres de formes, modes, effets, pour toute l'interface.
  const plugins = useMemo<AppPlugins | undefined>(
    () =>
      engine && {
        shapes: engine.getShapeRegistry(),
        modes: engine.getModeRegistry(),
        effects: engine.getEffectRegistry(),
        managesEdge: (edgeId) => engine.managesEdge(edgeId),
        allowedEffects: (page) => engine.allowedEffects(page),
        modePropertyViews: (page, scope, target, part, palette) =>
          engine.modePropertyViews(page, scope, target, part, palette),
      },
    [engine],
  );
  // Prise en main de la page affichée, pour les parties appli des modes (sujet 467).
  const selectedIds = useMemo(() => [...selected.shapes, ...selected.edges].map((e) => e.id), [selected]);
  const modeControls = useMemo<ModePageControls | undefined>(
    () => engine && { takeover: engine, selection: selectedIds, lockOwner: events.editLock?.owner },
    [engine, selectedIds, events.editLock],
  );
  // Palette et modes d'affichage permis par le mode de la page (sujet 178).
  const modes = plugins?.modes;
  // Couche du mode de la page sur la zone de dessin (ex. barre de la simulation, sujet 462).
  const CanvasOverlay = shownPage && modePanel(modes?.modeOf(shownPage)?.id)?.CanvasOverlay;
  const paletteContent = useMemo(() => engine?.paletteFor(currentPage), [engine, currentPage]);
  const allowedViewModes = (['top', 'iso', '3d'] as const).filter(
    (mode) => !shownPage || !modes || modes.allowsViewMode(shownPage, mode),
  );
  // Stables : la section Métriques du panneau ne relance pas sa mesure à chaque rendu.
  const getMetrics = useCallback(() => engine?.getMetrics(), [engine]);
  const setFrameSampling = useCallback((on: boolean) => engine?.setFrameSampling(on), [engine]);
  /** Export d'image (sujet 431) : téléchargé sous `<fichier>-<page>.png`. */
  const exportImage = useCallback(
    async (options: ImageExportOptions) => {
      try {
        const blob = await engine?.exportImage(options);
        if (!blob) {
          setError('Export : rien à dessiner');
          return;
        }
        const name = `${baseName(file.name)}-${currentPage?.name ?? 'page'}`.replace(/[\\/:*?"<>|]/g, '-');
        downloadBlob(blob, `${name}.png`);
      } catch (cause) {
        setError(`Export impossible : ${cause instanceof Error ? cause.message : String(cause)}`);
      }
    },
    [engine, file.name, currentPage?.name, setError],
  );
  const issueCount = (events.report?.unsupportedElementCount ?? 0) + warnings.length;
  // Titre de la barre de droite (et de sa bande quand elle est repliée) ; pas de panneau, pas de barre.
  const exportOpen = panel === 'export' && currentPage !== undefined;
  const rightTitle = diagnosticsOpen
    ? 'Diagnostics'
    : exportOpen
      ? 'Exporter'
      : currentPage &&
        contextTitle(selected.shapes, selected.edges, labelEdit ? 'text' : commentEdit ? 'comment' : undefined);

  return (
    <PluginsContext.Provider value={plugins}>
      <div className="app" style={{ '--bar-shadow-opacity': settings.panels.shadow } as CSSProperties}>
        <ViewerToolbar
          fileName={file.name}
          save={{
            onDisk: saving.onDisk,
            diskBlocked: saving.diskBlocked,
            modified: events.modified,
            autosave: settings.save.autosave,
            autosaving: saving.autosaving,
            autosavedAt: saving.autosavedAt,
          }}
          undoLabels={events.undoLabels}
          viewMode={events.viewMode}
          allowedViewModes={allowedViewModes}
          diagnostics={
            settings.debug.showUnsupportedPanel
              ? { open: diagnosticsOpen, issueCount, onToggle: () => togglePanel('diagnostics') }
              : undefined
          }
          exportOpen={exportOpen}
          settingsOpen={settingsOpen}
          error={error}
          onShowFiles={() => {
            if (modifiedRef.current && !window.confirm('Quitter sans sauvegarder les modifications ?')) return;
            flush();
            onShowFiles();
          }}
          onSave={saveFile}
          onToggleExport={() => togglePanel('export')}
          onUndo={() => engine?.undo()}
          onRedo={() => engine?.redo()}
          onViewModeChange={(mode) => engine?.setViewMode(mode)}
          onResetView={() => engine?.resetView()}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className={graphSlide ? 'viewport sliding' : 'viewport'}>
          {panelsPageId !== GRAPH_PAGE_ID && (
            <Sidebar
              side="left"
              label="Formes"
              layout={settings.panels.left}
              stripText={settings.panels.stripText}
              minCanvas={settings.panels.minCanvas}
              onChange={(left) => onSettingsChange({ panels: { left } })}
              slide={graphSlide?.slide}
            >
              <Palette
                disabled={!currentPage || editLocked}
                used={usedShapes}
                content={paletteContent}
                onAdd={(template) => engine?.addShape(template)}
              />
            </Sidebar>
          )}
          <div
            className="canvas-area"
            onDragOver={(event) => {
              if (!canAddShapes || editLocked || !event.dataTransfer.types.includes(PALETTE_MIME)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(event) => {
              const id = event.dataTransfer.getData(PALETTE_MIME);
              const template = plugins?.shapes.templates().find((t) => t.id === id);
              if (!template || !engine) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              engine.addShape(template, { x: event.clientX - rect.left, y: event.clientY - rect.top });
              engine.focusCanvas();
            }}
          >
            <SlidingModeBar
              indicator={transitioning ? undefined : modeIndicator}
              onChoose={(value) => engine?.setModeCurrent(value)}
              onRename={(label) => engine?.renameModeCurrent(label)}
            />
            <ParentPagesBar
              parents={events.parentPages}
              open={!transitioning && (modeHint === 'navigation' || backChoosing)}
              choosing={backChoosing}
              modeOf={(id) => {
                const page = document?.pages.find((p) => p.id === id);
                return page && modes?.modeOf(page);
              }}
              onChoose={(id) => {
                setBackChoosing(false);
                engine?.backTo(id);
              }}
              onShowGraph={
                pageId !== GRAPH_PAGE_ID && (document?.pages.length ?? 0) > 1
                  ? () => {
                      engine?.showGraph();
                      engine?.focusCanvas();
                    }
                  : undefined
              }
              onDismiss={dismissBackChoice}
            />
            {labelEdit && (
              <ViewerLabelEditor
                engine={engine}
                request={labelEdit}
                text={text}
                onClose={() => events.setLabelEdit(undefined)}
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
              minigraph={settings.minigraph}
              onMinigraphToggle={toggleMinigraph}
              initialView={initialView}
              autosave={settings.save.autosave}
              autosaveDelayMs={settings.save.delayMs}
              onSave={(xml, { auto }) => persist(xml, auto)}
              onEngine={events.handleEngine}
              onError={(e) => setError(e instanceof Error ? e.message : String(e))}
            />
            {CanvasOverlay && shownPage && modeControls && !transitioning && (
              <CanvasOverlay page={shownPage} controls={modeControls} />
            )}
            <ViewerComment
              engine={engine}
              request={commentEdit}
              hovered={events.hoverComment}
              settings={settings.comment}
              text={text}
              onClose={() => events.setCommentEdit(undefined)}
            />
          </div>
          {rightTitle && (
            <Sidebar
              side="right"
              label={rightTitle}
              slide={graphSlide?.slide}
              layout={settings.panels.right}
              stripText={settings.panels.stripText}
              minCanvas={settings.panels.minCanvas}
              onChange={(right) => onSettingsChange({ panels: { right } })}
            >
              {diagnosticsOpen ? (
                <DiagnosticsPanel
                  report={events.report}
                  warnings={warnings}
                  appError={error}
                  getMetrics={getMetrics}
                  setFrameSampling={setFrameSampling}
                  pageNames={Object.fromEntries((document?.pages ?? []).map((p) => [p.id, p.name]))}
                  onFocus={(page, element) => engine?.focusElement(page, element)}
                  onExport={() => exportJson(file.name, events.report, warnings, error)}
                  onClose={() => setPanel(undefined)}
                />
              ) : exportOpen ? (
                <ExportPanel
                  hasSelection={selected.shapes.length + selected.edges.length > 0}
                  onExport={exportImage}
                  onClose={() => setPanel(undefined)}
                />
              ) : (
                currentPage && (
                  <ViewerContextPanel
                    engine={engine}
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                    pages={document?.pages ?? []}
                    currentPage={currentPage}
                    selection={selection}
                    selected={selected}
                    editablePages={editablePages}
                    textEdit={text.textEdit}
                    modeControls={currentPage.id === pageId ? modeControls : undefined}
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
              onShowGraph={() => {
                engine?.showGraph();
                engine?.focusCanvas();
              }}
              onSelect={(id) => {
                engine?.goToPage(id);
                engine?.focusCanvas();
              }}
              modeOf={modes && ((page) => modes.modeOf(page))}
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
        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            onChange={onSettingsChange}
            onReset={onResetSettings}
            onResetOrientation={() => engine?.resetRotation()}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </PluginsContext.Provider>
  );
}
