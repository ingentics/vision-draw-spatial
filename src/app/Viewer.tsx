import robotoBoldItalic from '@fontsource/roboto/files/roboto-latin-700-italic.woff?url';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import robotoMonoBold from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url';
import robotoMono from '@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff?url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { GRAPH_PAGE_ID, isFilePath, jumpValue, labelPlacePatch, SPATIAL } from '../engine';
import type {
  CommentEditRequest,
  DocumentModel,
  EdgeModel,
  ElementComment,
  Engine,
  InitialView,
  LabelEditRequest,
  ModeHint,
  ParentLink,
  Selection,
  Settings,
  SettingsPatch,
  ShapeModel,
  StoredFile,
  UnsupportedReport,
  ViewMode,
} from '../engine';
import { DrawioSpatial } from '../react/DrawioSpatial';
import { exportJson } from './diagnosticsExport';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { desktop } from './desktop';
import { canWrite, requestWrite, writeDiskFile } from './diskFile';
import { saveAs, store } from './fileLibrary';
import { SlidingModeBar } from './ModeBar';
import { NavigationToolbar } from './NavigationToolbar';
import { LabelEditor } from './LabelEditor';
import type { RichEditorHandle, SelectionFormat } from './LabelEditor';
import { wholeTextChange } from './TextFormat';
import type { TextAction } from './TextFormat';
import { PageTabs } from './PageTabs';
import { ParentPagesBar } from './ParentPagesBar';
import { MULTI_SELECT_LABELS } from './SettingsPanel';
import { Palette, PALETTE_MIME } from './Palette';
import { PluginsContext } from './pluginsContext';
import type { AppPlugins } from './pluginsContext';
import { SettingsPanel } from './SettingsPanel';
import { ContextPanel, contextTitle } from './ContextPanel';
import { Sidebar } from './Sidebar';
import { CommentCard, CommentEditor, commentTextStyle } from './comment';

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
  /** Diagnostics dans la barre de droite ; sinon le panneau contextuel (page, forme, flèche) est affiché. */
  const [panel, setPanel] = useState<'diagnostics'>();
  const diagnosticsOpen = panel === 'diagnostics' && settings.debug.showUnsupportedPanel;
  const togglePanel = (name: 'diagnostics') => {
    // Barre de droite repliée : on a demandé ce panneau, elle se rouvre dessus.
    if (settings.panels.right.collapsed) {
      onSettingsChange({ panels: { right: { collapsed: false } } });
      setPanel(name);
    } else setPanel((open) => (open === name ? undefined : name));
  };
  /** Paramètres : fenêtre modale au-dessus de l'appli. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Pages parentes de la page courante : boutons du mode navigation (sujet 357). */
  const [parentPages, setParentPages] = useState<ParentLink[]>([]);
  /** Retour arrière avec plusieurs parents et une pile vide : les boutons des parents restent affichés pour choisir. */
  const [backChoosing, setBackChoosing] = useState(false);
  const dismissBackChoice = useCallback(() => setBackChoosing(false), []);
  const [modified, setModified] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<number>();
  /** Sauvegarde automatique en cours d'écriture (texte d'état de la barre d'outils). */
  const [autosaving, setAutosaving] = useState(false);
  /** Navigateur : fichier du disque ouvert, sa date de modification suivie au fil des écritures. */
  const diskRef = useRef(desktop ? undefined : file.disk);
  /** Écriture sur le disque non autorisée : avertissement dans la barre d'outils, un clic la demande. */
  const [diskBlocked, setDiskBlocked] = useState(false);
  const [undoLabels, setUndoLabels] = useState<{ undo?: string; redo?: string }>({});
  const [selection, setSelection] = useState<Selection>();
  /** « Courant » du mode de la page changé (ex. flux courant) : redessine l'indicateur et le panneau. */
  const [, setModeCurrentTick] = useState(0);
  const [modeHint, setModeHint] = useState<ModeHint>();
  /** Commentaire de l'élément survolé (encart en bas à gauche du rendu). */
  const [hoverComment, setHoverComment] = useState<ElementComment>();
  /** Commentaire en cours d'édition en place (dans l'encart du rendu) : élément, flèche ou non, commentaire actuel. */
  const [commentEdit, setCommentEdit] = useState<CommentEditRequest>();
  const [transitioning, setTransitioning] = useState(false);
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
  // Choisir un élément ramène le panneau contextuel (diagnostics fermés).
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

  // Navigateur : l'autorisation d'écrire ne survit pas toujours au rechargement ; on prévient dès l'ouverture.
  useEffect(() => {
    const disk = diskRef.current;
    if (disk)
      void canWrite(disk).then(
        (ok) => setDiskBlocked(!ok),
        () => setDiskBlocked(true),
      );
  }, []);

  /**
   * Navigateur : réécrit le fichier du disque d'où il a été ouvert. `ask` (geste de l'utilisateur) demande
   * l'autorisation au besoin ; sinon, sans autorisation, l'avertissement s'affiche et rien n'est écrit.
   */
  const writeDisk = useCallback(
    async (xml: string, ask: boolean) => {
      const disk = diskRef.current;
      if (!disk) return;
      if (!(await (ask ? requestWrite(disk) : canWrite(disk)))) {
        setDiskBlocked(true);
        return;
      }
      setDiskBlocked(false);
      diskRef.current = { ...disk, modifiedAt: await writeDiskFile(disk, xml) };
      await store.updateMeta(file.id, { disk: diskRef.current });
    },
    [file.id],
  );

  /**
   * Enregistre le XML sauvegardé (SPEC §14.1) : navigateur → bibliothèque, plus le fichier du disque s'il en
   * vient (étape 354), sinon téléchargement si demandé ; appli native → le vrai fichier (un exemple embarqué :
   * « Enregistrer sous » si demandé, sinon sa copie dans la bibliothèque).
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
      if (!desktop && !diskRef.current && !auto) download(file.name.split('/').pop() || 'diagram.drawio', xml);
      if (auto) setAutosaving(true);
      // Bibliothèque et disque à part : un refus d'écrire sur le disque garde la copie de la bibliothèque.
      Promise.all([store.updateMeta(file.id, { content: xml, size: xml.length }), writeDisk(xml, !auto)])
        .then(() => {
          setError(undefined);
          if (auto) setAutosavedAt(Date.now());
        }, report)
        .finally(() => auto && setAutosaving(false));
    },
    [file.id, file.name, save, onFileReplaced, writeDisk],
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
        setReport(instance.getUnsupportedReport());
      });
      const refreshBack = () => setParentPages(instance.getParentPages());
      // La barre du courant du mode part au début d'une transition et n'arrive qu'à sa fin.
      instance.on('transitionStart', () => setTransitioning(true));
      instance.on('transitionEnd', () => {
        setTransitioning(false);
        refreshBack();
      });
      instance.on('historyChange', () => {
        refreshBack();
        scheduleSave();
      });
      instance.on('linkUsed', scheduleSave);
      instance.on('backChoice', () => setBackChoosing(true));
      instance.on('modifiedChange', setModified);
      instance.on('undoChange', (undo, redo) => setUndoLabels({ undo, redo }));
      instance.on('selectionChange', setSelection);
      instance.on('modeCurrentChange', () => setModeCurrentTick((tick) => tick + 1));
      instance.on('modeHint', setModeHint);
      instance.on('commentHover', setHoverComment);
      instance.on('commentEdit', setCommentEdit);
      instance.on('labelEdit', setLabelEdit);
      instance.on('documentChange', (doc) => {
        setDocument(doc);
        setReport(instance.getUnsupportedReport());
        // Un lien ajouté ou retiré change les pages parentes.
        refreshBack();
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
        setBackChoosing(false);
        refreshBack();
        scheduleSave();
      });
      instance.on('cameraChange', (camera) => {
        // Arrondi au degré : pas de rendu React à chaque image tant que l'angle affiché ne change pas.
        setViewMode(camera.mode);
        scheduleSave();
      });
    },
    [scheduleSave, onSettingsChange],
  );

  const warnings = document?.warnings ?? [];
  /** Barre du courant du mode de la page (ex. flux courant), en haut de la zone de dessin. */
  const modeIndicator = pageId !== undefined ? engine?.getModeIndicator(pageId) : undefined;
  const editablePages = document !== undefined && engine?.canEditPages() === true;
  const canAddShapes = pageId !== undefined && pageId !== GRAPH_PAGE_ID;
  const shownPage = document?.pages.find((page) => page.id === pageId);
  // Formes de la page courante, pour la catégorie « Utilisées » de la palette.
  const usedShapes = useMemo(
    () => (canAddShapes && engine ? engine.usedTemplates(shownPage) : []),
    [canAddShapes, engine, shownPage],
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
  // Palette et modes d'affichage permis par le mode de la page (sujet 178).
  const modes = plugins?.modes;
  const paletteContent = useMemo(() => engine?.paletteFor(shownPage), [engine, shownPage]);
  const allowedViewModes = (['top', 'iso', '3d'] as const).filter(
    (mode) => !shownPage || !modes || modes.allowsViewMode(shownPage, mode),
  );
  // Stables : la section Métriques du panneau ne relance pas sa mesure à chaque rendu.
  const getMetrics = useCallback(() => engine?.getMetrics(), [engine]);
  const setFrameSampling = useCallback((on: boolean) => engine?.setFrameSampling(on), [engine]);
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
    : currentPage &&
      contextTitle(selected.shapes, selected.edges, labelEdit ? 'text' : commentEdit ? 'comment' : undefined);

  return (
    <PluginsContext.Provider value={plugins}>
      <div className="app" style={{ '--bar-shadow-opacity': settings.panels.shadow } as CSSProperties}>
        <header className="toolbar">
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
            className="button save-button"
            title={[
              desktop
                ? 'Enregistrer le fichier sous (Ctrl+S)'
                : diskRef.current
                  ? 'Enregistrer (Ctrl+S) : réécrit le fichier sur le disque et la bibliothèque'
                  : 'Enregistrer sous (Ctrl+S) : téléchargement et bibliothèque',
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
            {diskRef.current ? 'Enregistrer' : 'Enregistrer sous'}
          </button>
          {diskBlocked && (
            <button
              type="button"
              className="button disk-warning"
              title="Le navigateur n’autorise pas (encore) l’écriture du fichier sur le disque : les sauvegardes ne vont que dans la bibliothèque. Cliquer pour l’autoriser et enregistrer."
              onClick={saveFile}
            >
              ⚠ Écriture sur le disque non autorisée
            </button>
          )}
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
            allowedViewModes={allowedViewModes}
            onViewModeChange={(mode) => engine?.setViewMode(mode)}
            onResetView={() => engine?.resetView()}
          />
          {settings.save.autosave && (autosaving || modified || autosavedAt) && (
            <span className="save-status" role="status">
              {autosaving || modified ? 'Saving...' : 'All changes saved'}
            </span>
          )}
          <div className="toolbar-end">
            {settings.debug.showUnsupportedPanel && (
              <button
                type="button"
                className="button diagnostics-toggle"
                aria-pressed={diagnosticsOpen}
                aria-label="Diagnostics"
                title="Diagnostics : erreurs, éléments non supportés, avertissements"
                onClick={() => togglePanel('diagnostics')}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 1.5h1.5M7.5 1.5H9M3.75 1.5v4a2.5 2.5 0 0 0 5 0v-4M6.25 8v2.5a2.5 2.5 0 0 0 5 0V9" />
                  <circle className="diagnostics-chest" cx="11.25" cy="7.5" r="1.5" />
                </svg>
                {issueCount > 0 && <span className="pill">{issueCount}</span>}
              </button>
            )}
            <button
              type="button"
              className="button"
              aria-pressed={settingsOpen}
              aria-haspopup="dialog"
              title="Paramètres"
              onClick={() => setSettingsOpen(true)}
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
          {pageId !== GRAPH_PAGE_ID && (
            <Sidebar
              side="left"
              label="Formes"
              layout={settings.panels.left}
              stripText={settings.panels.stripText}
              minCanvas={settings.panels.minCanvas}
              onChange={(left) => onSettingsChange({ panels: { left } })}
            >
              <Palette
                disabled={!canAddShapes}
                used={usedShapes}
                content={paletteContent}
                onAdd={(template) => engine?.addShape(template)}
              />
            </Sidebar>
          )}
          <div
            className="canvas-area"
            onDragOver={(event) => {
              if (!canAddShapes || !event.dataTransfer.types.includes(PALETTE_MIME)) return;
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
              parents={parentPages}
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
              onDismiss={dismissBackChoice}
            />
            {labelEdit && (
              <LabelEditor
                key={`${labelEdit.pageId}:${labelEdit.elementId}:${labelEdit.end ?? ''}:${labelEdit.part ?? ''}`}
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
                onTextInput={labelEdit.onEdge ? undefined : (text) => engine?.previewEditedLabel(text)}
                onCommit={({ text, html }) => {
                  setLabelEdit(undefined);
                  engine?.closeLabelEdit();
                  if (labelEdit.part !== undefined) engine?.setPartText(labelEdit.elementId, labelEdit.part, text);
                  else if (labelEdit.labelCellId)
                    engine?.setEdgeText(labelEdit.elementId, labelEdit.labelCellId, text, html);
                  else if (labelEdit.end)
                    engine?.setEdgeEndLabel(labelEdit.elementId, labelEdit.end, text, html, labelEdit.flipped);
                  else engine?.setLabel(labelEdit.elementId, text, labelEdit.plain ? undefined : html);
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
            {commentEdit ? (
              <CommentEditor
                key={`${commentEdit.elementId}:${commentEdit.part ?? ''}`}
                comment={commentEdit.comment}
                plain={commentEdit.part !== undefined}
                settings={settings.comment}
                handle={editorHandle}
                onToggle={(mark) => formatText({ type: 'toggle', mark })}
                onSelectionFormat={setSelectionFormat}
                onCommit={(content) => {
                  setCommentEdit(undefined);
                  // Commentaire d'une partie (ex. champ, sujet 262) : texte brut, écrit par le mode.
                  if (commentEdit.part !== undefined)
                    engine?.setPartComment(commentEdit.elementId, commentEdit.part, content.text);
                  else engine?.setComment(commentEdit.elementId, content);
                  if (commentEdit.fromNavigation) engine?.clearSelection();
                  engine?.focusCanvas();
                }}
                onCancel={() => {
                  setCommentEdit(undefined);
                  if (commentEdit.fromNavigation) engine?.clearSelection();
                  engine?.focusCanvas();
                }}
              />
            ) : (
              <CommentCard comment={hoverComment} settings={settings.comment} />
            )}
          </div>
          {rightTitle && (
            <Sidebar
              side="right"
              label={rightTitle}
              layout={settings.panels.right}
              stripText={settings.panels.stripText}
              minCanvas={settings.panels.minCanvas}
              onChange={(right) => onSettingsChange({ panels: { right } })}
            >
              {diagnosticsOpen ? (
                <DiagnosticsPanel
                  report={report}
                  warnings={warnings}
                  appError={error}
                  getMetrics={getMetrics}
                  setFrameSampling={setFrameSampling}
                  pageNames={Object.fromEntries((document?.pages ?? []).map((p) => [p.id, p.name]))}
                  onFocus={(page, element) => engine?.focusElement(page, element)}
                  onExport={() => exportJson(file.name, report, warnings, error)}
                  onClose={() => setPanel(undefined)}
                />
              ) : (
                currentPage && (
                  <ContextPanel
                    page={currentPage}
                    pages={document?.pages ?? []}
                    shapes={selected.shapes}
                    edges={selected.edges}
                    part={selection?.pageId === currentPage.id ? selection.part : undefined}
                    styles={settings.styles}
                    modeSettings={settings.modes}
                    defaultDepth={settings.view.isoDepth}
                    multiSelectKey={MULTI_SELECT_LABELS[settings.controls.multiSelectKey]}
                    onLink={(link) => selection && engine?.setLink(selection.picked.element.id, link)}
                    onEditComment={() => selection && engine?.editComment(selection.picked.element.id)}
                    onSpatial={(key, value, merge) =>
                      selection && engine?.setSpatial(selection.picked.element.id, key, value, merge)
                    }
                    onEditLabel={() => selection && engine?.editLabel(selection.picked.element.id)}
                    onEndLabel={(end, text) =>
                      selection && engine?.setEdgeEndLabel(selection.picked.element.id, end, text)
                    }
                    onDelete={() => engine?.deleteSelection()}
                    onOrder={(move) => engine?.orderSelection(move)}
                    alignReference={settings.edit.alignReference}
                    onAlignReference={(alignReference) => onSettingsChange({ edit: { alignReference } })}
                    onAlign={(move) => engine?.alignSelection(move, settings.edit.alignReference)}
                    onDistribute={(move) => engine?.distributeSelection(move)}
                    onReverse={() => engine?.reverseEdges(selected.edges.map((edge) => edge.id))}
                    onResetRoute={() => selection && engine?.resetEdgeRoute(selection.picked.element.id)}
                    onEdgeStyle={(patch, merge) =>
                      engine?.setElementsStyle(
                        selected.edges.map((edge) => edge.id),
                        patch,
                        'Tracé',
                        merge,
                      )
                    }
                    onOrient={(action) =>
                      engine?.orientShapes(
                        selected.shapes.map((shape) => shape.id),
                        action,
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
                      // Texte brut (sujet 258) : pas de panneau de format.
                      labelEdit && !labelEdit.plain
                        ? {
                            style: labelEdit.style,
                            selection: selectionFormat,
                            canFormat: labelEdit.styleCellId !== undefined,
                            onEdge: labelEdit.onEdge,
                            fittedSize,
                            presets: settings.styles.text,
                            onAction: formatText,
                            onOwner: () => editorHandle.current?.commit(),
                          }
                        : labelEdit || commentEdit?.part !== undefined
                          ? undefined
                          : commentEdit && {
                              // Commentaire : le format de tout le texte est celui des réglages, les commandes du panneau
                              // portent sur la sélection ou sur tout le commentaire (`CommentEditor`).
                              style: commentTextStyle(settings.comment),
                              selection: selectionFormat,
                              canFormat: true,
                              onEdge: commentEdit.onEdge,
                              comment: true,
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
                    onPageEffect={
                      editablePages
                        ? (effectId, enabled) => engine?.setPageEffect(currentPage.id, effectId, enabled)
                        : undefined
                    }
                    onPageAnchoring={
                      editablePages ? (anchoring) => engine?.setPageAnchoring(currentPage.id, anchoring) : undefined
                    }
                    defaultAnchoring={settings.shapes.edgeAnchoring}
                    onPageJumps={editablePages ? (jumps) => engine?.setPageJumps(currentPage.id, jumps) : undefined}
                    defaultJumps={settings.shapes.edgeJumpStyle}
                    pageJumps={jumpValue(currentPage.attributes[SPATIAL.jumps]) ?? settings.shapes.edgeJumpStyle}
                    defaultJumpSize={settings.shapes.edgeJumpSize}
                    onModeEdit={editablePages ? (label, edit) => engine?.editPageMode(label, edit) : undefined}
                    modeCurrent={engine?.getModeCurrent(currentPage.id)}
                    onModeProperty={
                      editablePages
                        ? (scope, targetId, key, value, part, merge) =>
                            engine?.setModeProperty(scope, targetId, key, value, part, merge)
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

/** Propose le fichier au téléchargement (sous son nom d'origine). */
function download(name: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/xml' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
