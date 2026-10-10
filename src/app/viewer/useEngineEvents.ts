import { useCallback, useState } from 'react';
import type { MutableRefObject } from 'react';
import { GRAPH_PAGE_ID } from '../../engine';
import type {
  CommentEditRequest,
  DocumentModel,
  ElementComment,
  Engine,
  LabelEditRequest,
  ModeHint,
  ParentLink,
  Selection,
  Settings,
  SettingsPatch,
  SimulationSession,
  UnsupportedReport,
  ViewMode,
} from '../../engine';
import type { SidebarSlide } from '../Sidebar';

/** Réglages iso qu'une page peut imposer (état de vue enregistré dans le fichier). */
const ISO_KEYS = ['isoAngleDeg', 'isoAzimuthDeg', 'isoVolume', 'isoDepth'] as const;

/**
 * État de l'interface tenu à jour par les événements du moteur affiché : document, page, sélection, édition en
 * place, transitions, annulation… `handleEngine` est à passer au composant (`onEngine`) ; il tient aussi `engineRef`
 * à jour, pour les rappels créés une seule fois.
 */
export function useEngineEvents({
  engineRef,
  settingsRef,
  scheduleSave,
  onSettingsChange,
  setError,
}: {
  engineRef: MutableRefObject<Engine | undefined>;
  settingsRef: MutableRefObject<Settings>;
  scheduleSave: () => void;
  onSettingsChange: (patch: SettingsPatch) => void;
  setError: (error: string | undefined) => void;
}) {
  const [engine, setEngine] = useState<Engine>();
  const [document, setDocument] = useState<DocumentModel>();
  const [pageId, setPageId] = useState<string>();
  const [viewMode, setViewMode] = useState<ViewMode>('top');
  const [report, setReport] = useState<UnsupportedReport>();
  /** Pages parentes de la page courante : boutons du mode navigation (sujet 357). */
  const [parentPages, setParentPages] = useState<ParentLink[]>([]);
  /** Retour arrière avec plusieurs parents et une pile vide : les boutons des parents restent affichés pour choisir. */
  const [backChoosing, setBackChoosing] = useState(false);
  const [modified, setModified] = useState(false);
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
  /**
   * Passage page ↔ vue graphe en cours (sujet 363) : les barres latérales partent vers leur bord (`out`) ou en
   * arrivent (`in`, avec la page d'arrivée, dont les barres s'affichent dès le début de la plongée).
   */
  const [graphSlide, setGraphSlide] = useState<{ slide: SidebarSlide; pageId?: string }>();
  const [labelEdit, setLabelEdit] = useState<LabelEditRequest>();
  /**
   * Simulation d'un mode ouverte (sujet 461) ; `step` change à chaque pas, pour redessiner ce qui la montre.
   */
  const [simulation, setSimulation] = useState<{ session: SimulationSession; step: number }>();

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
        // Fichier chargé (rechargement de la page, ouverture) : les touches vont à la zone de dessin (sujet 419).
        instance.focusCanvas();
      });
      const refreshBack = () => setParentPages(instance.getParentPages());
      // La barre du courant du mode part au début d'une transition et n'arrive qu'à sa fin.
      instance.on('transitionStart', (from, to) => {
        setTransitioning(true);
        if (to === GRAPH_PAGE_ID) setGraphSlide({ slide: 'out' });
        else if (from === GRAPH_PAGE_ID) setGraphSlide({ slide: 'in', pageId: to });
      });
      instance.on('transitionEnd', () => {
        setTransitioning(false);
        setGraphSlide(undefined);
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
      instance.on('simulationChange', (session) =>
        setSimulation((previous) => session && { session, step: (previous?.step ?? 0) + 1 }),
      );
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
    [engineRef, scheduleSave, onSettingsChange, settingsRef, setError],
  );

  return {
    engine,
    handleEngine,
    document,
    pageId,
    viewMode,
    report,
    parentPages,
    backChoosing,
    setBackChoosing,
    modified,
    undoLabels,
    selection,
    modeHint,
    hoverComment,
    commentEdit,
    setCommentEdit,
    transitioning,
    graphSlide,
    labelEdit,
    setLabelEdit,
    simulation,
  };
}
