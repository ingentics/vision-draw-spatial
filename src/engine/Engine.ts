import {
  Box3,
  Color,
  Group,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { collectUnsupported } from './diagnostics/unsupportedStyles';
import type { UnsupportedReport } from './diagnostics/unsupportedStyles';
import { Emitter } from './events';
import { formatLink, isNavigableLink } from './format/link';
import {
  canMoveCell,
  cellLabelValue,
  formatNumber,
  gridSizeOf,
  moveCell,
  resizeCell,
  setLabelPlacement,
  setCellLabel,
  setCellObjectAttribute,
  setCellRichLabel,
  setCellStyleValue,
  moveEdgeCell,
  setEdgePoints,
  setEdgeTerminal,
} from './format/edit';
import {
  addEdgeCell,
  addEdgeLabelCell,
  addPage,
  addShapeCell,
  removeCells,
  removeCellsDeep,
  removePage,
  renamePage,
  setCellLink,
} from './format/create';
import { copyCells, pasteCells, readClipboardModel } from './format/clipboard';
import { documentFromTree, readDrawio } from './format/parse';
import { readPageViews, writePageViews } from './format/viewState';
import type { IsoViewParams, PageViewState } from './format/viewState';
import { writeDrawio } from './format/write';
import type { DrawioTree, PageTree } from './format/xmlTree';
import {
  applyEndAttachment,
  connectableShapes,
  connectionPoints,
  constraintStyle,
  CONNECTION_POINTS,
  endAttachmentOf,
  restoreEnds,
  sameAttachment,
  snapshotEnds,
  writeEndAttachment,
} from './edit/edgeEnds';
import type { EdgeEndsSnapshot, EndAttachment, TerminalEnd } from './edit/edgeEnds';
import { dragPoints, pointHandles, pointsEditor, removePoint } from './edit/edgePoints';
import type { PointHandle, PointsContext } from './edit/edgePoints';
import { collectMoveSet, isLocked, moveTarget, snapDelta, translateMoveSet, unionMoveSets } from './edit/move';
import type { MoveSet } from './edit/move';
import {
  anchorOf,
  edgeTextLayout,
  edgeTexts,
  endAt,
  endLabelOf,
  flipTarget,
  setEdgeTextPlacement,
} from './edit/edgeLabels';
import type { EdgeTextLayout, EndTextGap } from './edit/edgeLabels';
import { labelPoint, placementAt, positionAlong } from './render/edges/polyline';
import { setLineResolution } from './render/lines';
import type { EdgeEnd } from './edit/edgeLabels';
import { handlePoints, resizeBounds } from './edit/handles';
import type { HandleKind, ResizeHandle } from './edit/handles';
import { dropBounds } from './edit/palette';
import { applyStylePreset } from './edit/styles';
import type { StylePreset } from './edit/styles';
import { UndoStack } from './edit/undo';
import type { ShapeTemplate } from './edit/palette';
import {
  applyCameraState,
  applyPerspectiveState,
  defaultView,
  setCameraLimits,
  fitBounds,
  interpolateCamera,
  normalizeAngle,
  normalizeCameraState,
  pageToScreen,
  perspectiveAmount,
  rotateAround,
  sameView,
  screenToPage,
  settleProjection,
  tiltFromElevation,
  withViewMode,
  zoomAt,
} from './interaction/camera';
import type { CameraState, ViewMode, Viewport } from './interaction/camera';
import { createGrid } from './render/grid';
import type { Grid, GridOptions } from './render/grid';
import { CameraController } from './interaction/controls';
import type { ControlSettings, HeldKeys } from './interaction/controls';
import { NavigationHistory, findParents, usageKey } from './interaction/history';
import type { HistoryEntry, LinkUsage, ParentLink } from './interaction/history';
import { buildGraphPage, cardId, GRAPH_PAGE_ID } from './graph/graphPage';
import type { GraphLayout } from './graph/graphPage';
import { buildGraphScene } from './graph/graphScene';
import { Minimap } from './interaction/minimap';
import { pickElement } from './interaction/pick';
import type { PickedElement } from './interaction/pick';
import { marqueeTakes } from './interaction/marquee';
import type { Footprint } from './interaction/marquee';
import { MODIFIER_KEY_LABELS, followLinkGesture, independentRoots, toggleSelected } from './interaction/selection';
import { easing, embedIn, embeddedCamera, phase } from './interaction/transitions';
import { computeBounds } from './model/bounds';
import type {
  DocumentModel,
  EdgeLabelPlacement,
  EdgeModel,
  LinkModel,
  PageModel,
  Point,
  Rect,
  ShapeModel,
} from './model/types';
import { linkZone, selectionOutline } from './render/decorations';
import { createEdge, toTerminal } from './render/edges/edge';
import { fixedAnchor, routeEdgePoints, routingCenter } from './render/edges/route';
import {
  connectionHints,
  connectorPreview,
  edgeEndHandles,
  edgePointHandles,
  selectionHandles,
} from './render/handles';
import { createVeil, createVeilHole, liftAboveVeil } from './render/highlight';
import { disposeObject } from './render/meshes';
import { setPageOpacity } from './render/pageEffects';
import { buildPageScene, createShapeObject, effectiveLevel, placeInDrawOrder } from './render/pageScene';
import type { PageScene } from './render/pageScene';
import { SceneManager } from './render/sceneManager';
import { outsideLabelBox } from './render/labelPosition';
import { createDefaultRegistry } from './render/shapes/registry';
import type { ShapeRegistry } from './render/shapes/registry';
import type { SceneLevel } from './render/shapes/types';
import { setPageTransform } from './render/space';
import { createTroikaTextFactory } from './render/troikaText';
import { DEFAULT_SETTINGS, mergeSettings, resolveReducedMotion } from './settings';
import { SPATIAL_PREFIX, spatialValue } from './spatial';
import type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from './settings';
import type { FontSet } from './render/troikaText';

export type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from './settings';

export interface Selection {
  pageId: string;
  /** Dernier élément sélectionné (le seul, hors sélection multiple). */
  picked: PickedElement;
  /** Tous les éléments sélectionnés, dans l'ordre de sélection (`picked` est le dernier). */
  items: PickedElement[];
}

/** Ouvre une URL externe (SPEC §11.4) : nouvel onglet, sans accès retour à cette page. */
function defaultOpenUrl(href: string): void {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Cadrage d'une page vide : le haut de la feuille draw.io, pour que les formes ajoutées
 * tombent en coordonnées positives (sur la page, à l'ouverture dans draw.io).
 */
const EMPTY_PAGE_AREA: Rect = { x: 0, y: 0, width: 800, height: 600 };

function isEmptyPage(page: PageModel): boolean {
  return page.shapes.length === 0 && page.edges.length === 0;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  fonts?: FontSet;
  /** Pour ajouter ou surcharger des renderers de formes. */
  registry?: ShapeRegistry;
  /** Couleur de fond initiale (#rrggbb) ; le paramètre `background.color` la remplace s'il est fourni. */
  background?: string;
  /** Paramètres (SPEC §13) ; ensuite modifiables par `updateSettings`. */
  settings?: SettingsPatch;
  /** Ouverture des liens URL (par défaut : nouvel onglet du navigateur). */
  openUrl?: (href: string) => void;
  /**
   * Édition (SPEC §14) : déplacer, redimensionner, créer, modifier… Désactivée par défaut :
   * le moteur est alors une visionneuse (navigation, liens, sélection).
   */
  editable?: boolean;
}

/** Vue à restaurer au chargement (SPEC §5.3) : dernière page active et caméras par page. */
export interface InitialView {
  pageId?: string;
  /** Caméra de la page `pageId` (prioritaire sur `cameraByPage`). */
  camera?: CameraState;
  cameraByPage?: Record<string, CameraState>;
  /** Pile de navigation à restaurer (SPEC §11.3). */
  history?: HistoryEntry[];
  /** Dernière utilisation des liens du fichier, pour trier les pages parentes. */
  linkUsage?: LinkUsage;
}

/** Ce que ferait « Retour » depuis la page courante. */
export type BackTarget =
  | { kind: 'history'; entry: HistoryEntry; pageName: string }
  | { kind: 'parent'; parent: ParentLink }
  | { kind: 'choose'; parents: ParentLink[] }
  | { kind: 'none' };

/** Mode d'interaction signalé à l'UI : touche pour suivre un lien, ou de sélection multiple, maintenue. */
export type ModeHint = 'navigation' | 'multiSelect';

export type EngineEvents = {
  load: [document: DocumentModel, fileId: string];
  pageChange: [page: PageModel];
  cameraChange: [state: CameraState];
  selectionChange: [selection: Selection | undefined];
  /** Transition vers une page par un lien : début et fin (entrées ignorées entre les deux). */
  transitionStart: [fromPageId: string, toPageId: string];
  transitionEnd: [pageId: string];
  /** Les paramètres ont changé (à persister / refléter dans l'UI). */
  settingsChange: [settings: Settings];
  /** Touche M : l'UI affiche ou masque la mini-carte. */
  minimapToggle: [];
  /** La pile de navigation a changé (à persister). */
  historyChange: [entries: HistoryEntry[]];
  /** Un lien entre pages vient d'être suivi (à persister pour trier les parents). */
  linkUsed: [fromPageId: string, toPageId: string, at: number];
  /** « Retour » sans historique et plusieurs parents possibles : à l'UI de proposer le choix. */
  backChoice: [parents: ParentLink[]];
  /** Pages ou formes ajoutées, retirées ou renommées : nouveau modèle du document. */
  documentChange: [document: DocumentModel];
  /** Édition du label d'un élément demandée (double-clic, F2) : à l'UI d'afficher un champ. */
  labelEdit: [request: LabelEditRequest];
  /** Mode d'interaction en cours (touche maintenue), pour l'aide de l'UI ; undefined : aucun. */
  modeHint: [hint: ModeHint | undefined];
  /** Ce qu'annuleraient / rétabliraient `undo` et `redo` (undefined : rien). */
  undoChange: [undoLabel: string | undefined, redoLabel: string | undefined];
  /** Le document a été modifié (déplacement) ou vient d'être sérialisé pour la sauvegarde. */
  modifiedChange: [modified: boolean];
};
export type EngineEvent = keyof EngineEvents;

/** Champ d'édition de label à afficher par l'UI, à l'emprise de l'élément (pixels du canvas). */
export interface LabelEditRequest {
  pageId: string;
  elementId: string;
  /** Texte de début ou de fin d'une flèche (`setEdgeEndLabel`) ; absent = label de l'élément (`setLabel`). */
  end?: EdgeEnd;
  /**
   * Label enfant d'une flèche en cours d'édition (texte de début, de fin, ou placé ailleurs) : validé par
   * `setEdgeText`. Absent : le label de l'élément, ou un texte de début / fin encore à créer (`end`).
   */
  labelCellId?: string;
  /** Texte brut actuel. */
  text: string;
  screen: Rect;
  /**
   * Forme vue de biais ou tournée (iso, volume, vue inclinée ou pivotée) : sa zone de texte, en pixels de
   * page, et ses quatre coins à l'écran (haut-gauche, haut-droit, bas-droit, bas-gauche), là où le label est
   * dessiné. L'éditeur s'y plaque (même plan, même sens). Absent : vue de dessus, `screen` suffit.
   */
  plane?: LabelEditPlane;
  /**
   * Cellule dont le style porte le format du texte (la forme, l'arête, ou le label enfant d'un début /
   * fin) ; absente quand le texte n'existe pas encore (début / fin à créer) : pas de format possible.
   */
  styleCellId?: string;
  /** Style draw.io de cette cellule (police, taille, couleur, alignement), pour un éditeur fidèle. */
  style: Record<string, string>;
  /** Label HTML de la cellule (`html=1`), avec sa mise en forme partielle ; absent : texte brut. */
  html?: string;
  /** Pixels écran par pixel de page à cet endroit : taille du texte dans l'éditeur. */
  scale: number;
  /**
   * Texte d'une flèche : `screen` est alors le point du texte (largeur et hauteur nulles), l'éditeur se
   * centre dessus et prend la taille du texte, comme le label dessiné.
   */
  onEdge: boolean;
  /** Fond du texte (`labelBackgroundColor` explicite) ; absent : transparent. */
  background?: string;
  /** Texte de début / fin encore à créer, de l'autre côté du trait (bascule avant la création). */
  flipped?: boolean;
  /**
   * Bascule possible de l'autre côté du trait (texte de début / fin dans sa configuration par défaut) :
   * direction du saut à l'écran de la page. Absente si le texte a été placé à la main.
   */
  flip?: 'up' | 'down' | 'left' | 'right';
  /** Halo autour des lettres (texte de flèche sans fond, paramètre `shapes.edgeLabelBackdrop`) : couleur de la page. */
  halo?: string;
  /** Épaisseur et flou du halo, en pixels de page. */
  haloWidth?: number;
  haloBlur?: number;
}

/** Plan du texte d'une forme à l'écran (`LabelEditRequest.plane`). */
export interface LabelEditPlane {
  width: number;
  height: number;
  corners: [Point, Point, Point, Point];
}

/** Glisser d'édition en cours (SPEC §14.1). */
interface MoveDrag {
  kind: 'move';
  pageId: string;
  /** Formes dont la géométrie XML est réécrite (plusieurs en sélection multiple). */
  rootIds: string[];
  set: MoveSet;
  /**
   * Flèches sélectionnées avec les formes (hors groupe déplacé) : elles bougent aussi, et un bout dont la
   * forme ne bouge pas est détaché, comme draw.io (`disconnectOnMove`) ; point libre au début du glisser.
   */
  edges: Array<{ id: string; detach: Array<{ end: TerminalEnd; point?: Point }> }>;
  start: Point;
  origin: Rect;
  applied: Point;
  grid: number;
  started: boolean;
}

interface ResizeDrag {
  kind: 'resize';
  pageId: string;
  shapeId: string;
  handle: ResizeHandle;
  start: Point;
  origin: Rect;
  grid: number;
  /** La forme, son contenu (déplacé si le coin haut-gauche bouge) et ses arêtes reliées. */
  children: MoveSet;
  started: boolean;
}

interface ConnectDrag {
  kind: 'connect';
  pageId: string;
  sourceId: string;
  /** Forme visée, en attache auto ou sur un point de connexion (entrée fixe). */
  target?: Exclude<EndAttachment, { kind: 'free' }>;
  started: boolean;
}

/** Bout d'une flèche déplacé par sa poignée : attaché à une forme (auto ou point fixe) ou libre. */
interface EdgeEndDrag {
  kind: 'edgeEnd';
  pageId: string;
  edgeId: string;
  end: TerminalEnd;
  /** Extrémités d'origine, remises en place si le bout revient où il était. */
  original: EdgeEndsSnapshot;
  attachment?: EndAttachment;
  started: boolean;
}

/** Poignée entre les bouts d'une flèche (segment, coude, point) : points intermédiaires réécrits. */
interface EdgePointsDrag {
  kind: 'edgePoints';
  pageId: string;
  edgeId: string;
  handle: PointHandle;
  /** État de la flèche au début du glisser : les points se calculent toujours à partir de lui. */
  context: PointsContext;
  original: Point[];
  points?: Point[];
  started: boolean;
}

/** Texte d'une flèche déplacé par sa poignée (le long du tracé et de côté). */
interface LabelDrag {
  kind: 'label';
  pageId: string;
  edgeId: string;
  /** Cellule du texte : l'arête (son label) ou un label enfant (début, fin…). */
  cellId: string;
  /** Décalage libre du label, gardé ; position et distance suivent le pointeur. */
  offset: Point;
  placement?: EdgeLabelPlacement;
  started: boolean;
}

/** Ancre d'un texte de flèche : début, milieu ou fin (position le long du tracé). */
export type EdgeTextAnchor = 'start' | 'middle' | 'end';

/** Style des connecteurs créés (celui de draw.io par défaut) ; le tracé vient du paramètre `shapes.edgeLineStyle`. */
const CONNECTOR_STYLE = 'orthogonalLoop=1;jettySize=auto;html=1;';
/** Clés du tracé d'une flèche : droite (sans routeur), angles droits, coudes arrondis, courbe (orthogonaux). */
const EDGE_LINE_KEYS = {
  straight: 'rounded=0;',
  sharp: 'edgeStyle=orthogonalEdgeStyle;rounded=0;',
  rounded: 'edgeStyle=orthogonalEdgeStyle;rounded=1;',
  curved: 'edgeStyle=orthogonalEdgeStyle;rounded=0;curved=1;',
} as const;
/** Tolérance d'alignement des points d'une flèche (mxGraph.tolerance de draw.io), en pixels écran. */
const EDGE_POINT_TOLERANCE = 4;

function samePoints(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);
}

/** Curseur de chaque poignée de redimensionnement. */
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
};

/** Façade publique du moteur (SPEC §4.3). Aucune dépendance à React. */
export class Engine {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  /** Caméra de la vue 3D (et des bascules vers / depuis la 3D). */
  private readonly perspectiveCamera = new PerspectiveCamera();
  /** Fond de la vue et grille (SPEC §9.5). */
  private readonly grid: Grid;
  /** Dernier mode hors 3D, où revient la touche P. */
  private lastFlatMode: 'top' | 'iso' = 'top';
  private readonly registry: ShapeRegistry;
  private readonly text: ReturnType<typeof createTroikaTextFactory>;
  private readonly events = new Emitter<EngineEvents>();
  private readonly resizeObserver: ResizeObserver;
  private readonly controller: CameraController;

  private document: DocumentModel | undefined;
  /** Arbre XML d'origine du document chargé, base de l'écriture in situ (SPEC §14.2). */
  private xmlTree: DrawioTree | undefined;
  private unsupportedReport: UnsupportedReport | undefined;
  private fileId: string | undefined;
  private readonly scenes: SceneManager;
  private currentPageId: string | undefined;
  /** Dernière caméra de chaque page visitée (SPEC §9.4). */
  private pageCameras = new Map<string, CameraState>();
  /** Texte en cours d'édition en place (son label dessiné est masqué). */
  private labelEditing?: LabelEditRequest;
  private cameraState: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 };
  private settings: Settings;
  /** Préférence système « réduire les animations » (suivie en direct). */
  private readonly reducedMotionQuery: MediaQueryList | undefined;
  private viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  private pendingFit: Rect | undefined;
  private frame = 0;
  private animation = 0;
  private disposed = false;

  private readonly openUrl: (href: string) => void;
  private selection: Selection | undefined;
  /** Contours de la sélection (style « contour »), un par élément sélectionné. */
  private selectionObject: Group | undefined;
  /** Touche pour suivre un lien maintenue : zones liées de la page en évidence (`linkZonesObject`). */
  private linkZonesShown = false;
  private heldKeys: HeldKeys = { followLink: false, multiSelect: false };
  private modeHint: ModeHint | undefined;
  private linkZonesObject: Group | undefined;
  /** Contour animé : décalage des tirets (pixels écran) et boucle d'animation. */
  private selectionPhase = 0;
  /** Voile de mise en valeur de la sélection, et de quoi l'annuler. */
  private veil: { key: string; object: Object3D; restore: () => void } | undefined;
  /** Trou du voile autour d'une flèche sélectionnée (dépend du zoom : largeur fixe à l'écran). */
  private veilHole: { key: string; object: Object3D } | undefined;
  private selectionAnimation = 0;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Transition en cours : de quoi l'interrompre proprement. */
  private transition: { abort: () => void } | undefined;
  private readonly history = new NavigationHistory();
  /** Bascule 2D ↔ volume en cours : scènes en fondu enchaîné (renseignées à la première image). */
  private levelBlend: { volume?: PageScene; flat?: PageScene } | undefined;
  /** Hauteur courante des volumes iso (0 à 1, suit l'inclinaison). */
  private heightScale = 1;
  /** Vue graphe du document (SPEC §12), construite à la première demande. */
  private graph: { page: PageModel; layout: GraphLayout } | undefined;
  /** Dernière page du document affichée (pour revenir du graphe). */
  private lastDocumentPageId: string | undefined;
  private minimap: Minimap | undefined;
  private linkUsage: LinkUsage = {};
  /** Réglages iso de chaque page (lus du fichier, puis ceux en vigueur à la dernière visite). */
  private pageIso = new Map<string, IsoViewParams>();
  /** Modifications non sauvegardées. */
  private modified = false;
  /** Glisser d'édition en cours (déplacement, redimensionnement, connecteur). */
  private drag: MoveDrag | ResizeDrag | ConnectDrag | EdgeEndDrag | EdgePointsDrag | LabelDrag | undefined;
  private connectorPreview: Object3D | undefined;
  /** Contours des formes pour le clic (`shapeOutline`). */
  private readonly outlines = new WeakMap<
    ShapeModel,
    { bounds: Rect; style: Record<string, string>; outline: Point[] | undefined }
  >();
  /** Poignées de la forme sélectionnée. */
  private handlesObject: Object3D | undefined;
  private readonly undoStack = new UndoStack<string>();
  /**
   * Dernière copie faite dans l'appli (ticket 59) : son XML, sa page d'origine et le parent de ses
   * éléments (pour recoller dans le même conteneur), et le décalage du prochain collage, en pas de grille.
   */
  private clipboard:
    { xml: string; fileId?: string; pageId: string; parents: Map<string, string>; steps: number } | undefined;
  private editable: boolean;

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? createDefaultRegistry();
    const initial = options.background
      ? mergeSettings(DEFAULT_SETTINGS, { background: { color: options.background } })
      : DEFAULT_SETTINGS;
    this.settings = mergeSettings(initial, options.settings);
    this.applyCameraLimits();
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery?.addEventListener?.('change', this.onReducedMotionChange);
    if (this.settings.view.defaultMode !== 'top') {
      this.cameraState = withViewMode(
        this.cameraState,
        this.settings.view.defaultMode,
        this.isoTilt(),
        this.isoAzimuth(),
      );
    }
    this.openUrl = options.openUrl ?? defaultOpenUrl;
    this.editable = options.editable ?? false;
    // Stencil : trous du voile de sélection autour des flèches (render/highlight).
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true, stencil: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new Color(this.settings.background.color);
    this.grid = createGrid(this.gridOptions());
    this.scene.add(this.grid.mesh);
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.requestRender);
    this.scenes = new SceneManager(
      this.scene,
      (page, level) =>
        page.id === GRAPH_PAGE_ID && this.graph && this.document
          ? buildGraphScene(page, this.graph.layout, this.document, this.registry, this.renderContext(), level)
          : buildPageScene(page, this.registry, this.renderContext(), level),
      this.settings.preload.maxCachedPages,
      (page) => effectiveLevel(page, this.registry, this.requestedLevel()),
    );

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    this.controller = new CameraController(
      this.canvas,
      {
        getCameraState: () => this.cameraState,
        setCameraState: (state) => this.setCameraState(state),
        getViewport: () => this.viewport,
        toggleOverview: (screen) => this.toggleOverview(screen),
        click: (screen, options) => this.handleClick(screen, options.toggle, options.followLink),
        doubleClick: (screen, options) => this.handleDoubleClick(screen, options.followLink),
        heldKeys: (held) => this.setHeldKeys(held),
        hover: (screen) => this.handleHover(screen),
        back: () => this.back(),
        toggleViewMode: () => this.toggleViewMode(),
        toggle3d: () => this.toggle3d(),
        toggleMinimap: () => this.events.emit('minimapToggle'),
        toggleGraph: () => this.toggleGraph(),
        beginMove: (screen) => this.beginMove(screen),
        moveTo: (screen, options) => this.moveTo(screen, options.snap),
        endMove: () => this.endMove(),
        canMarquee: (screen) => !!this.editablePage() && !this.pickAt(screen),
        selectInRect: (rect, options) => this.selectInRect(rect, options),
        editSelection: () => this.editLabel(),
        deleteSelection: () => this.deleteSelection(),
        canDeleteSelection: () => {
          const editable = this.editablePage();
          return !!editable && this.selection?.pageId === editable.page.id;
        },
        escape: () => this.clearSelection(),
      },
      this.effectiveControls(),
    );
  }

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const { document, tree } = readDrawio(xml);
    this.document = document;
    this.xmlTree = tree;
    this.fileId = fileId;
    this.unsupportedReport = collectUnsupported(document, this.registry);
    this.transition?.abort();
    this.clearSelection();
    this.scenes.clear();
    this.currentPageId = undefined;
    this.graph = undefined;
    this.lastDocumentPageId = undefined;
    this.drag = undefined;
    this.undoStack.clear();
    this.syncModified();
    this.history.replace(initialView?.history ?? []);
    this.linkUsage = { ...initialView?.linkUsage };
    // Vues enregistrées dans le fichier, remplacées par celles mémorisées localement (plus récentes).
    const fileViews = readPageViews(tree);
    this.pageIso = new Map([...fileViews].flatMap(([id, view]) => (view.iso ? [[id, view.iso] as const] : [])));
    this.pageCameras = new Map([...fileViews].map(([id, view]) => [id, normalizeCameraState(view.camera)]));
    for (const [id, camera] of Object.entries(initialView?.cameraByPage ?? {})) {
      this.pageCameras.set(id, normalizeCameraState(camera));
    }
    if (initialView?.pageId && initialView.camera) {
      this.pageCameras.set(initialView.pageId, normalizeCameraState(initialView.camera));
    }
    this.events.emit('load', document, fileId);
    const page = (initialView?.pageId && this.pageById(initialView.pageId)) || document.pages[0];
    if (!page) {
      this.scenes.hideAll();
      this.requestRender();
      return;
    }
    this.goToPage(page.id);
  }

  getDocument(): DocumentModel | undefined {
    return this.document;
  }

  /** Arbre XML d'origine du document chargé : ses `cells` ont les mêmes ids que le modèle. */
  getXmlTree(): DrawioTree | undefined {
    return this.xmlTree;
  }

  /** Modifications non sauvegardées depuis le chargement ou la dernière sérialisation. */
  isModified(): boolean {
    return this.modified;
  }

  /**
   * XML du document à sauvegarder (SPEC §14.2) : l'arbre d'origine, modifié en place, avec l'état
   * de vue de chaque page visitée (caméra, mode et réglages de rendu). Le document est ensuite
   * considéré comme sauvegardé.
   */
  serialize(): string | undefined {
    if (!this.xmlTree) return undefined;
    this.endMove();
    if (this.currentPageId) this.pageIso.set(this.currentPageId, this.isoParams());
    const views = new Map<string, PageViewState>();
    for (const [id, camera] of this.pageCameras) {
      if (id === GRAPH_PAGE_ID) continue;
      const iso = this.pageIso.get(id);
      views.set(id, iso ? { camera, iso } : { camera });
    }
    writePageViews(this.xmlTree, views);
    const xml = writeDrawio(this.xmlTree);
    this.undoStack.markSaved();
    this.syncModified();
    return xml;
  }

  // -------------------------------------------------------------------------
  // Création (SPEC §14.1)

  /** Rend le focus clavier au canvas (ex. après un dépôt depuis la palette). */
  focusCanvas(): void {
    this.canvas.focus({ preventScroll: true });
  }

  /** Geste d'édition en cours (déplacement, redimensionnement, connecteur) : ne pas l'interrompre. */
  isDragging(): boolean {
    return this.drag?.started === true;
  }

  isEditable(): boolean {
    return this.editable;
  }

  /** Active ou désactive l'édition (poignées, glisser, commandes d'édition). */
  setEditable(editable: boolean): void {
    if (this.editable === editable) return;
    this.endMove();
    this.editable = editable;
    this.updateSelectionOutline();
  }

  /** Pages modifiables : fichier `<mxfile>` (l'ancien format n'a qu'une page sans nom). */
  canEditPages(): boolean {
    return this.editable && this.xmlTree?.xml.documentElement?.tagName === 'mxfile';
  }

  /**
   * Ajoute une forme de la palette sur la page courante, centrée sur un point écran (dépôt) ou au
   * centre de la vue : point projeté au sol (vue de dessus comme iso), aimanté à la grille.
   * Renvoie l'id de la nouvelle cellule, sélectionnée.
   */
  addShape(template: ShapeTemplate, screen?: Point): string | undefined {
    const editable = this.editablePage();
    if (!editable) return undefined;
    const { page, pageTree } = editable;
    this.endMove();
    const at = screenToPage(
      this.cameraState,
      this.viewport,
      screen ?? { x: this.viewport.width / 2, y: this.viewport.height / 2 },
    );
    const bounds = dropBounds(template, at, gridSizeOf(pageTree));
    this.recordEdit('Nouvelle forme');
    const style = withStyleValue(template.style, 'fontSize', String(this.settings.shapes.textSize));
    const id = addShapeCell(pageTree, { style, value: template.value, ...bounds });
    this.documentChanged([page.id]);
    const shape = this.getCurrentPage()?.shapes.find((s) => s.id === id);
    if (shape) this.select({ type: 'shape', element: shape });
    return id;
  }

  /** Ajoute une page vide (« Page-n ») et l'affiche. */
  addPage(name?: string): string | undefined {
    if (!this.xmlTree || !this.document || !this.canEditPages() || this.transition) return undefined;
    const names = new Set(this.document.pages.map((p) => p.name));
    let pageName = name?.trim();
    for (let n = this.document.pages.length + 1; !pageName || names.has(pageName); n++) pageName = `Page-${n}`;
    this.recordEdit('Nouvelle page');
    const page = addPage(this.xmlTree, pageName);
    this.documentChanged([]);
    this.goToPage(page.id);
    return page.id;
  }

  renamePage(pageId: string, name: string): void {
    const trimmed = name.trim();
    const page = this.pageById(pageId);
    if (!this.xmlTree || !page || !trimmed || trimmed === page.name || !this.canEditPages()) return;
    this.recordEdit('Page renommée');
    renamePage(this.xmlTree, pageId, trimmed);
    this.documentChanged([]);
  }

  /** Retire une page (pas la dernière) ; si c'était la page affichée, on passe à sa voisine. */
  removePage(pageId: string): void {
    const document = this.document;
    if (!this.xmlTree || !document || !this.canEditPages() || document.pages.length <= 1 || this.transition) return;
    const index = document.pages.findIndex((p) => p.id === pageId);
    if (index < 0) return;
    const wasCurrent = this.currentPageId === pageId || this.isGraphView();
    this.endMove();
    this.recordEdit('Page supprimée');
    removePage(this.xmlTree, pageId);
    this.scenes.invalidate(pageId, true);
    this.pageCameras.delete(pageId);
    this.pageIso.delete(pageId);
    if (this.lastDocumentPageId === pageId) this.lastDocumentPageId = undefined;
    const entries = this.history.entries();
    const kept = entries.filter((e) => e.pageId !== pageId && e.targetPageId !== pageId);
    if (kept.length !== entries.length) {
      this.history.replace(kept);
      this.events.emit('historyChange', kept);
    }
    if (this.currentPageId === pageId) this.currentPageId = undefined;
    this.documentChanged([]);
    if (wasCurrent && !this.isGraphView()) {
      const next = this.document!.pages[Math.min(index, this.document!.pages.length - 1)];
      if (next) this.goToPage(next.id);
    }
  }

  /** Arbre XML d'une page du document (même rang que dans le modèle). */
  private pageTreeOf(pageId: string) {
    const index = this.document?.pages.findIndex((p) => p.id === pageId) ?? -1;
    return index >= 0 ? this.xmlTree?.pages[index] : undefined;
  }

  /**
   * L'arbre a changé de structure : le modèle est relu de l'arbre, les scènes des pages touchées et
   * de la vue graphe sont reconstruites, la sélection est reprise par id.
   */
  private documentChanged(changedPageIds: string[]): void {
    if (!this.xmlTree) return;
    const selected = this.selection;
    this.clearSelection();
    this.document = documentFromTree(this.xmlTree);
    this.unsupportedReport = collectUnsupported(this.document, this.registry);
    this.graph = undefined;
    for (const id of [...changedPageIds, GRAPH_PAGE_ID]) this.scenes.invalidate(id, true);
    const current = this.getCurrentPage();
    if (current) {
      this.scenes.show(current);
      this.applyHeightScale();
      this.hideEditedLabel();
    }
    if (selected && selected.pageId === current?.id) {
      const items: PickedElement[] = [];
      for (const { element } of selected.items) {
        const shape = current.shapes.find((s) => s.id === element.id);
        const edge = current.edges.find((e) => e.id === element.id);
        if (shape) items.push({ type: 'shape', element: shape });
        else if (edge) items.push({ type: 'edge', element: edge });
      }
      if (items.length > 0) this.selectItems(items);
    }
    this.syncBackground();
    this.minimap?.invalidate();
    this.syncModified();
    this.events.emit('documentChange', this.document);
    this.requestRender();
  }

  private setModified(modified: boolean): void {
    if (this.modified === modified) return;
    this.modified = modified;
    this.events.emit('modifiedChange', modified);
  }

  /** Éléments non supportés du document chargé, triés par fréquence (SPEC §8.4). */
  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.unsupportedReport;
  }

  /**
   * Va à la page d'un élément et cadre dessus (diagnostics, liens). Les formes sont cadrées
   * sur leurs bornes, les arêtes sur leur tracé dessiné.
   */
  focusElement(pageId: string, elementId: string): void {
    if (this.currentPageId !== pageId) this.goToPage(pageId);
    const page = this.getCurrentPage();
    if (!page) return;
    const bounds = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.drawnBounds(elementId) ?? page.bounds;
    this.animateCameraTo(
      fitBounds(bounds, this.viewport, {
        ...this.orientation(),
        padding: this.settings.camera.focusPadding,
        maxZoom: this.settings.camera.focusMaxZoom,
      }),
    );
  }

  /** Emprise dessinée d'un élément de la page courante, en coordonnées page. */
  private drawnBounds(elementId: string): Rect | undefined {
    const object = this.sceneObject(elementId);
    if (!object) return undefined;
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) return undefined;
    // Monde → page : X = x, Z = y.
    return { x: box.min.x, y: box.min.z, width: box.max.x - box.min.x, height: box.max.z - box.min.z };
  }

  getFileId(): string | undefined {
    return this.fileId;
  }

  getCurrentPage(): PageModel | undefined {
    return this.currentPageId ? this.pageById(this.currentPageId) : undefined;
  }

  /** Scène de la page courante (lecture seule : diagnostics, tests). */
  getPageScene(): PageScene | undefined {
    return this.scenes.current;
  }

  /** Pages dont la scène est construite, de la moins à la plus récemment affichée. */
  getCachedPageIds(): string[] {
    return this.scenes.cachedIds();
  }

  /** Dernière caméra de chaque page visitée (à persister, SPEC §5.1 `cameraByPage`). */
  getPageCameras(): Record<string, CameraState> {
    return structuredClone(Object.fromEntries(this.pageCameras));
  }

  /**
   * Affiche une page (SPEC §9.4) : sa scène est reprise du cache si elle a déjà été construite,
   * et sa caméra est celle de la dernière visite (sinon la page entière est cadrée).
   */
  goToPage(pageId: string): void {
    const page = this.pageById(pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    this.transition?.abort();
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.endMove();
    if (this.currentPageId !== page.id) this.clearSelection();
    this.applyPageIso(page.id);
    this.currentPageId = page.id;
    if (page.id !== GRAPH_PAGE_ID) this.lastDocumentPageId = page.id;
    this.scenes.show(page);
    this.applyHeightScale();
    this.syncBackground();
    this.minimap?.invalidate();
    const camera = this.pageCameras.get(page.id);
    if (camera) this.setCameraState(camera);
    else this.fitToBounds(isEmptyPage(page) ? EMPTY_PAGE_AREA : page.bounds);
    this.requestRender();
    this.updateLinkZones();
    this.events.emit('pageChange', page);
  }

  getCameraState(): CameraState {
    return structuredClone(this.cameraState);
  }

  /** Cadre une emprise de la page courante (sans dépasser 100 %), dans l'orientation courante. */
  fitToBounds(bounds: Rect): void {
    if (!this.isMeasured()) {
      this.pendingFit = bounds;
      return;
    }
    this.setCameraState(fitBounds(bounds, this.viewport, this.orientation()));
  }

  setCameraState(state: CameraState): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.endLevelBlend();
    this.applyCamera(settleProjection(normalizeCameraState(state)));
  }

  /**
   * Anime la caméra vers un état (instantané si les animations sont réduites). Toute autre entrée
   * l'interrompt. `blendLevels` : bascule 2D ↔ volume, en fondu enchaîné des deux rendus.
   */
  animateCameraTo(target: CameraState, durationMs = this.settings.camera.animationMs, blendLevels = false): void {
    this.endLevelBlend();
    if (this.reducedMotion() || durationMs <= 0) {
      this.setCameraState(target);
      return;
    }
    cancelAnimationFrame(this.animation);
    if (blendLevels && this.settings.view.isoVolume) this.levelBlend = {};
    const from = this.cameraState;
    const to = normalizeCameraState(target);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-in-out cubique.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.applyCamera(interpolateCamera(from, to, eased));
      this.animation = t < 1 ? requestAnimationFrame(step) : 0;
      if (t >= 1) this.endLevelBlend();
    };
    this.animation = requestAnimationFrame(step);
  }

  /**
   * Vue globale de la page courante, dans l'orientation actuelle. Contrairement au cadrage
   * d'ouverture, elle n'est pas plafonnée à 100 % : un petit schéma remplit l'écran,
   * sinon la bascule globale ↔ 1:1 n'aurait aucun effet.
   */
  getOverviewState(): CameraState | undefined {
    const page = this.getCurrentPage();
    if (!page) return undefined;
    return fitBounds(page.bounds, this.viewport, { ...this.orientation(), maxZoom: this.settings.camera.maxZoom });
  }

  /**
   * Bascule vue globale ↔ 1:1 (touche Entrée). Depuis la vue globale, passe à 100 % autour
   * du point écran donné (ou du centre) ; depuis toute autre vue, revient à la vue globale.
   */
  toggleOverview(screen?: Point): void {
    const overview = this.getOverviewState();
    if (!overview) return;
    const current = this.cameraState;
    if (sameView(current, overview, this.viewport)) {
      const anchor = screen ?? { x: this.viewport.width / 2, y: this.viewport.height / 2 };
      this.animateCameraTo(zoomAt(current, this.viewport, anchor, 1 / current.zoom));
    } else {
      this.animateCameraTo(overview);
    }
  }

  /** Page du document, ou la page générée de la vue graphe. */
  private pageById(id: string): PageModel | undefined {
    if (id === GRAPH_PAGE_ID) return this.getGraphPage();
    return this.document?.pages.find((p) => p.id === id);
  }

  /**
   * Niveau de rendu demandé par le mode de vue (repli à plat si les formes n'en ont pas). En
   * revenant à la 2D, les volumes restent tant que la caméra est inclinée ou en perspective :
   * ils s'aplatissent pendant l'animation (`applyHeightScale`), la page passe à plat à l'arrivée.
   */
  private requestedLevel(): SceneLevel {
    const { mode, tilt, fov } = this.cameraState;
    const volume = mode !== 'top' || tilt > 0 || fov !== undefined;
    return volume && this.settings.view.isoVolume ? 'iso' : 'flat';
  }

  private renderContext() {
    return {
      text: this.text,
      volume: {
        depth: this.settings.view.isoDepth,
        shadeLight: this.settings.view.shadeLight,
        shadeDark: this.settings.view.shadeDark,
        tags: this.settings.view.facadeTags,
      },
      background: this.settings.background.color,
      placeholder: { fill: this.settings.shapes.placeholderFill, stroke: this.settings.shapes.placeholderStroke },
      accent: this.settings.selection.accentColor,
      edgeFontColor: this.settings.shapes.edgeFontColor,
      edgeLabelBackdrop: {
        kind: this.settings.shapes.edgeLabelBackdrop,
        haloWidth: this.settings.shapes.edgeLabelHaloWidth,
        haloBlur: this.settings.shapes.edgeLabelHaloBlur,
      },
    };
  }

  /** Grille de la page courante : pas de la page draw.io (`gridSize`) si demandé et défini, sinon celui des paramètres. */
  private gridOptions(): GridOptions {
    const background = this.settings.background;
    const tree = background.gridFromPage && this.currentPageId ? this.pageTreeOf(this.currentPageId) : undefined;
    const pageCell = tree && tree.encoding !== 'unreadable' ? gridSizeOf(tree) : 0;
    return {
      visible: background.grid,
      background: background.color,
      color: background.gridColor,
      cell: pageCell > 0 ? pageCell : background.gridSize,
      majorEvery: background.majorEvery,
      minorStrength: background.minorStrength,
    };
  }

  private syncBackground(): void {
    (this.scene.background as Color).set(this.settings.background.color);
    this.grid.setOptions(this.gridOptions());
    this.requestRender();
  }

  /**
   * Volumes iso : la hauteur des blocs suit l'inclinaison (ils « poussent » pendant la bascule
   * 2D → iso, et s'aplatissent si l'on remonte vers la vue de dessus), ou la perspective : pleine
   * hauteur en 3D, même vue d'aplomb.
   */
  private applyHeightScale(): void {
    const scene = this.scenes.current;
    if (!scene || scene.level !== 'iso' || this.transition) return;
    const tilted = this.cameraState.tilt / Math.max(this.isoTilt(), 1e-6);
    const scale = Math.min(1, Math.max(0, tilted, perspectiveAmount(this.cameraState)));
    this.heightScale = scale;
    setPageTransform(scene.root, undefined, scale);
    this.blendLevels(scene, scale);
  }

  /**
   * Fondu enchaîné d'une bascule 2D ↔ volume : la scène en volume (qui s'aplatit ou pousse)
   * apparaît avec la hauteur des blocs, la scène à plat de la même page disparaît d'autant.
   */
  private blendLevels(volume: PageScene, weight: number): void {
    const blend = this.levelBlend;
    const page = this.getCurrentPage();
    if (!blend || !page) return;
    const flat = blend.flat ?? this.scenes.overlay(page, 'flat');
    if (flat === volume) return;
    blend.flat = flat;
    blend.volume = volume;
    setPageOpacity(volume.root, weight);
    setPageOpacity(flat.root, 1 - weight);
  }

  /** Fin (ou interruption) du fondu enchaîné : chaque scène retrouve son opacité, seule la courante reste visible. */
  private endLevelBlend(): void {
    const blend = this.levelBlend;
    if (!blend) return;
    this.levelBlend = undefined;
    for (const scene of [blend.volume, blend.flat]) if (scene) setPageOpacity(scene.root, 1);
    const page = this.getCurrentPage();
    if (page && !this.transition && (blend.volume || blend.flat)) {
      this.scenes.show(page);
      this.applyHeightScale();
      // La sélection suit la scène affichée (voile, contour, poignées).
      this.updateSelectionOutline();
      this.requestRender();
    }
  }

  /** Les volumes ont changé (activés, épaisseur) : on reconstruit les scènes. */
  private rebuildScenes(): void {
    this.scenes.clear();
    const page = this.getCurrentPage();
    if (page) this.scenes.show(page);
    this.applyHeightScale();
    this.updateSelectionOutline();
    this.minimap?.invalidate();
    this.requestRender();
  }

  private applyCamera(state: CameraState): void {
    this.pendingFit = undefined;
    const previousZoom = this.cameraState.zoom;
    const previousLevel = this.requestedLevel();
    this.cameraState = normalizeCameraState(state);
    // Changement de niveau (mode, ou fin d'une bascule vers la 2D) : la page passe au rendu de ce
    // niveau (même scène si tout est à plat).
    let sceneChanged = false;
    if (this.requestedLevel() !== previousLevel && !this.transition) {
      const page = this.getCurrentPage();
      if (page) {
        this.scenes.show(page);
        this.minimap?.invalidate();
        sceneChanged = true;
      }
    }
    if (this.currentPageId) {
      this.pageCameras.set(this.currentPageId, this.cameraState);
      if (!this.transition) this.pageIso.set(this.currentPageId, this.isoParams());
    }
    this.minimap?.requestDraw();
    // Contour de sélection d'épaisseur constante à l'écran ; la sélection est transférée à la scène
    // du nouveau niveau quand on change de vue (2D ↔ iso / 3D).
    if (this.selection && (sceneChanged || this.cameraState.zoom !== previousZoom)) this.updateSelectionOutline();
    if (this.linkZonesShown && (sceneChanged || this.cameraState.zoom !== previousZoom)) this.updateLinkZones();
    this.applyProjection();
    this.applyHeightScale();
    this.relocateLabelEdit();
    this.events.emit('cameraChange', this.getCameraState());
    this.requestRender();
  }

  // -------------------------------------------------------------------------
  // Modes de vue (SPEC §9.1)

  getViewMode(): ViewMode {
    return this.cameraState.mode;
  }

  /** Bascule animée vers la vue de dessus, isométrique ou 3D ; le centre de l'écran ne bouge pas. */
  setViewMode(mode: ViewMode): void {
    if (this.transition) return;
    if (this.cameraState.mode !== '3d') this.lastFlatMode = this.cameraState.mode;
    // Entre la 2D (à plat) et l'iso / la 3D (volumes) : fondu enchaîné des deux rendus.
    const crossesFlat = (this.cameraState.mode === 'top') !== (mode === 'top');
    this.animateCameraTo(
      withViewMode(this.cameraState, mode, this.isoTilt(), this.isoAzimuth()),
      this.settings.view.switchDurationMs,
      crossesFlat,
    );
  }

  toggleViewMode(): void {
    this.setViewMode(this.cameraState.mode === 'iso' ? 'top' : 'iso');
  }

  /** Touche P : vers la 3D, ou retour au dernier mode 2D / iso. */
  toggle3d(): void {
    this.setViewMode(this.cameraState.mode === '3d' ? this.lastFlatMode : '3d');
  }

  getViewSettings(): ViewSettings {
    return { ...this.settings.view };
  }

  setViewSettings(patch: Partial<ViewSettings>): void {
    this.updateSettings({ view: patch });
  }

  /** Réglages iso en vigueur (enregistrés par page). */
  private isoParams(): IsoViewParams {
    const { isoAngleDeg, isoAzimuthDeg, isoVolume, isoDepth } = this.settings.view;
    return { isoAngleDeg, isoAzimuthDeg, isoVolume, isoDepth };
  }

  /**
   * Reprend les réglages iso enregistrés pour une page (fichier ou dernière visite), sans animer :
   * la caméra de la page est appliquée juste après. L'UI les reçoit par `settingsChange`.
   */
  private applyPageIso(pageId: string): void {
    const iso = this.pageIso.get(pageId);
    const view = this.settings.view;
    if (
      !iso ||
      (view.isoAngleDeg === iso.isoAngleDeg &&
        view.isoAzimuthDeg === iso.isoAzimuthDeg &&
        view.isoVolume === iso.isoVolume &&
        view.isoDepth === iso.isoDepth)
    ) {
      return;
    }
    this.settings = mergeSettings(this.settings, { view: iso });
    if (view.isoVolume !== this.settings.view.isoVolume || view.isoDepth !== this.settings.view.isoDepth) {
      this.scenes.clear();
    }
    this.events.emit('settingsChange', this.getSettings());
  }

  private isoTilt(): number {
    return tiltFromElevation(this.settings.view.isoAngleDeg);
  }

  private isoAzimuth(): number {
    return (this.settings.view.isoAzimuthDeg * Math.PI) / 180;
  }

  /** Orientation de référence du mode courant : 0 en vue de dessus, l'azimut iso en isométrie et en 3D. */
  getReferenceRotation(): number {
    return this.cameraState.mode === 'top' ? 0 : normalizeAngle(this.isoAzimuth());
  }

  /** Orientation courante (mode, rotation, inclinaison), conservée par les cadrages. */
  private orientation(): { rotation: number; tilt: number; mode: ViewMode } {
    return { rotation: this.cameraState.rotation, tilt: this.cameraState.tilt, mode: this.cameraState.mode };
  }

  // -------------------------------------------------------------------------
  // Vue graphe (SPEC §12)

  /** Page générée de la vue graphe (cartes des pages, flèches des liens). */
  getGraphPage(): PageModel | undefined {
    if (!this.document) return undefined;
    this.graph ??= buildGraphPage(this.document, this.settings.graph);
    return this.graph.page;
  }

  isGraphView(): boolean {
    return this.currentPageId === GRAPH_PAGE_ID;
  }

  /**
   * Affiche la vue graphe. Depuis une page : la page rétrécit dans sa carte (transition inverse
   * d'un lien), puis on recule jusqu'à la vue d'ensemble du graphe (ou sa dernière vue).
   */
  showGraph(): void {
    const graph = this.getGraphPage();
    const page = this.getCurrentPage();
    if (!graph || !page || page.id === GRAPH_PAGE_ID || this.transition) return;
    const card = graph.shapes.find((s) => s.id === cardId(page.id));
    this.runTransition({
      direction: 'out',
      outer: graph,
      inner: page,
      frame: card?.bounds,
      destination: this.pageCameras.get(GRAPH_PAGE_ID) ?? fitBounds(graph.bounds, this.viewport, this.orientation()),
    });
  }

  /** Touche G : graphe ↔ dernière page affichée (en plongeant dans sa carte). */
  toggleGraph(): void {
    if (!this.isGraphView()) {
      this.showGraph();
      return;
    }
    const target = this.lastDocumentPageId ?? this.document?.pages[0]?.id;
    if (target) this.followLink(cardId(target));
  }

  /**
   * Affiche la mini-carte dans un canvas fourni par l'UI (SPEC §10). Renvoie de quoi la détacher.
   * `size` : largeur en pixels CSS (la hauteur suit les proportions de la page).
   */
  attachMinimap(canvas: HTMLCanvasElement, size = 200): () => void {
    this.minimap?.dispose();
    const minimap = new Minimap(
      canvas,
      {
        getPage: () => this.getCurrentPage(),
        getCamera: () => this.cameraState,
        getViewport: () => this.viewport,
        getBackground: () => this.settings.background.color,
        getAccent: () => this.settings.selection.accentColor,
        getEdgeRoute: (id) => this.sceneObject(id)?.userData.route as Point[] | undefined,
        paintShape: (context, shape, map) => this.registry.minimapPainter(shape)?.(context, shape, map),
        centerOn: (point) => {
          if (!this.transition) this.setCameraState({ ...this.cameraState, center: point });
        },
      },
      size,
    );
    this.minimap = minimap;
    minimap.invalidate();
    return () => {
      minimap.dispose();
      if (this.minimap === minimap) this.minimap = undefined;
    };
  }

  /** Vue par défaut du mode courant (orientation de référence, page entière), en animation. */
  resetView(): void {
    const page = this.getCurrentPage();
    if (!page || this.transition) return;
    const { mode } = this.cameraState;
    this.animateCameraTo(defaultView(page.bounds, this.viewport, mode, this.isoTilt(), this.isoAzimuth()));
  }

  /** Revient à l'orientation de référence du mode (nord en haut, ou l'orientation iso), autour du centre de l'écran. */
  resetRotation(): void {
    const center = { x: this.viewport.width / 2, y: this.viewport.height / 2 };
    const delta = normalizeAngle(this.getReferenceRotation() - this.cameraState.rotation);
    this.animateCameraTo(rotateAround(this.cameraState, this.viewport, center, delta));
  }

  getControls(): ControlSettings {
    return structuredClone(this.settings.controls);
  }

  setControls(patch: Partial<ControlSettings>): void {
    this.updateSettings({ controls: patch });
  }

  // -------------------------------------------------------------------------
  // Paramètres (SPEC §13)

  getSettings(): Settings {
    return structuredClone(this.settings);
  }

  /**
   * Modifie des paramètres, section par section ; tout s'applique immédiatement : contrôles,
   * transitions, préchargement, taille du cache, et en iso l'élévation / l'orientation (animées ;
   * l'orientation est absolue : la vue prend exactement l'angle choisi).
   */
  updateSettings(patch: SettingsPatch): void {
    const previous = this.settings;
    this.settings = mergeSettings(previous, patch);
    this.controller.setSettings(this.effectiveControls());
    this.scenes.setMaxCached(this.settings.preload.maxCachedPages);
    this.syncSelectionAnimation();
    this.updateSelectionOutline();
    const changed = <K extends keyof Settings>(section: K) =>
      JSON.stringify(this.settings[section]) !== JSON.stringify(previous[section]);
    if (changed('camera')) this.applyCameraLimits();
    if (changed('graph')) this.graph = undefined;
    if (
      this.settings.view.isoVolume !== previous.view.isoVolume ||
      this.settings.view.isoDepth !== previous.view.isoDepth ||
      this.settings.view.shadeLight !== previous.view.shadeLight ||
      this.settings.view.shadeDark !== previous.view.shadeDark ||
      this.settings.view.facadeTags !== previous.view.facadeTags ||
      // Fonds de labels « default » = couleur du fond.
      this.settings.background.color !== previous.background.color ||
      this.settings.selection.accentColor !== previous.selection.accentColor ||
      changed('shapes') ||
      changed('graph')
    ) {
      this.rebuildScenes();
    }
    if (changed('camera') && !this.transition && !this.animation) this.setCameraState(this.cameraState);
    if (this.settings.selection.accentColor !== previous.selection.accentColor) this.minimap?.requestDraw();
    this.syncBackground();

    const view = this.settings.view;
    if (this.currentPageId && !this.transition) this.pageIso.set(this.currentPageId, this.isoParams());
    const isoChanged =
      view.isoAngleDeg !== previous.view.isoAngleDeg || view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
    if (isoChanged && this.cameraState.mode === 'iso' && !this.transition) {
      // Orientation absolue quand l'azimut change ; sinon la rotation faite à la souris est gardée.
      const azimuthChanged = view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
      const rotation = azimuthChanged ? normalizeAngle(this.isoAzimuth()) : this.cameraState.rotation;
      const target = { ...this.cameraState, tilt: this.isoTilt(), rotation };
      if (!sameView(target, this.cameraState, this.viewport)) this.animateCameraTo(target, view.switchDurationMs);
    }
    this.events.emit('settingsChange', this.getSettings());
  }

  /** Bornes de la caméra (zoom, inclinaison et champ de vision de la 3D) : paramètres « Caméra ». */
  private applyCameraLimits(): void {
    const camera = this.settings.camera;
    setCameraLimits({
      minZoom: camera.minZoom,
      maxZoom: camera.maxZoom,
      minZoom3d: camera.minZoom3d,
      maxZoom3d: camera.maxZoom3d,
      maxTilt3d: (camera.maxTilt3dDeg * Math.PI) / 180,
      fov: (camera.fovDeg * Math.PI) / 180,
    });
  }

  /** Animations réduites : réglage d'accessibilité, ou préférence système si « système ». */
  reducedMotion(): boolean {
    return resolveReducedMotion(this.settings.accessibility.reducedMotion, this.reducedMotionQuery?.matches ?? false);
  }

  /** Contrôles effectifs : pas de glissade quand les animations sont réduites. */
  private effectiveControls(): ControlSettings {
    const controls = this.settings.controls;
    return this.reducedMotion() ? { ...controls, decelerationMs: 0 } : controls;
  }

  private readonly onReducedMotionChange = (): void => {
    this.controller.setSettings(this.effectiveControls());
    this.syncSelectionAnimation();
    this.events.emit('settingsChange', this.getSettings());
  };

  // -------------------------------------------------------------------------
  // Sélection et liens (SPEC §11)

  getSelection(): Selection | undefined {
    return this.selection;
  }

  getTransitionSettings(): TransitionSettings {
    return { ...this.settings.transition };
  }

  setTransitionSettings(patch: Partial<TransitionSettings>): void {
    this.updateSettings({ transition: patch });
  }

  getPreloadSettings(): PreloadSettings {
    return { ...this.settings.preload };
  }

  setPreloadSettings(patch: Partial<PreloadSettings>): void {
    this.updateSettings({ preload: patch });
  }

  isTransitioning(): boolean {
    return this.transition !== undefined;
  }

  /** Élément de la page courante sous un point écran. */
  pickAt(screen: Point): PickedElement | undefined {
    const page = this.getCurrentPage();
    if (!page) return undefined;
    // Texte d'une flèche, même placé loin d'elle : la flèche.
    const text = this.edgeTextAt(screen);
    if (text) return { type: 'edge', element: text.edge };
    const point = screenToPage(this.cameraState, this.viewport, screen);
    return pickElement(page, point, {
      edgeTolerance: this.settings.edit.edgePickTolerance / this.cameraState.zoom,
      edgeRoute: (id) => {
        const data = this.sceneObject(id)?.userData;
        return (data?.path ?? data?.route) as Point[] | undefined;
      },
      heightOf: (id) => this.elementTop(id),
      pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
      outlineOf: (shape) => this.shapeOutline(shape),
    });
  }

  /** Contour d'une forme (sa définition), mémorisé tant que ses bornes et son style ne changent pas. */
  private shapeOutline(shape: ShapeModel): Point[] | undefined {
    const cached = this.outlines.get(shape);
    if (cached && cached.bounds === shape.bounds && cached.style === shape.style) return cached.outline;
    const outline = this.registry.resolve(shape).definition.outline?.(shape);
    this.outlines.set(shape, { bounds: shape.bounds, style: shape.style, outline });
    return outline;
  }

  select(picked: PickedElement | undefined): void {
    this.selectItems(picked ? [picked] : []);
  }

  /**
   * Sélection multiple (touche `controls.multiSelectKey` + clic) : ajoute l'élément à la sélection
   * de la page courante, ou l'en retire s'il y est déjà.
   */
  toggleSelect(picked: PickedElement): void {
    const current = this.selection?.pageId === this.currentPageId ? (this.selection?.items ?? []) : [];
    this.selectItems(toggleSelected(current, picked));
  }

  /** Sélectionne ces éléments de la page courante (aucun = désélection). */
  selectItems(items: PickedElement[]): void {
    const page = this.getCurrentPage();
    const picked = items[items.length - 1];
    this.selection = picked && page ? { pageId: page.id, picked, items: [...items] } : undefined;
    this.updateSelectionOutline();
    this.syncSelectionAnimation();
    this.events.emit('selectionChange', this.selection);
    this.emitModeHint();
  }

  /**
   * Sélection par zone (ticket 60) : éléments visibles de la page courante dont l'emprise à l'écran
   * (volume compris en iso) est dans le rectangle — ou le touche (`touch`). Un élément pris avec son
   * conteneur n'est pas sélectionné à part. `add` : ajoute à la sélection au lieu de la remplacer.
   */
  selectInRect(rect: Rect, options: { add: boolean; touch: boolean }): void {
    const page = this.getCurrentPage();
    if (!page) return;
    const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
    const candidates: PickedElement[] = [
      ...page.shapes
        // Les groupes sont invisibles : on prend leurs formes (sauf s'ils portent un lien, comme au clic).
        .filter((s) => s.kind !== 'group' || s.link)
        .map((element) => ({ type: 'shape' as const, element })),
      ...page.edges.map((element) => ({ type: 'edge' as const, element })),
    ].filter(({ element }) => element.visible && !hiddenLayers.has(element.layerId));
    const taken = candidates.filter((item) => {
      const footprint = this.screenFootprint(item);
      return footprint !== undefined && marqueeTakes(footprint, rect, options.touch);
    });
    const ids = new Set(taken.map((item) => item.element.id));
    const parentOf = new Map(page.shapes.map((s) => [s.id, s.parentId]));
    const hasTakenAncestor = (id: string | undefined): boolean =>
      id !== undefined && (ids.has(id) || hasTakenAncestor(parentOf.get(id)));
    const roots = taken
      .filter((item) => !hasTakenAncestor(item.element.parentId))
      .sort((a, b) => a.element.z - b.element.z);
    const current = options.add && this.selection?.pageId === page.id ? this.selection.items : [];
    const kept = current.filter((item) => !roots.some((r) => r.element.id === item.element.id));
    this.selectItems([...kept, ...roots]);
  }

  /** Emprise à l'écran d'un élément : base et dessus d'une forme, tracé d'une flèche. */
  private screenFootprint(item: PickedElement): Footprint | undefined {
    const top = this.elementTop(item.element.id);
    if (item.type === 'shape') {
      const { x, y, width, height } = item.element.bounds;
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      const heights = top === 0 ? [0] : [0, top];
      return { points: heights.flatMap((h) => corners.map((p) => this.screenOfPoint(p, h))), closed: true };
    }
    const route = this.sceneObject(item.element.id)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    return { points: route.map((p) => this.screenOfPoint(p, top)), closed: false };
  }

  /** La sélection compte-t-elle plusieurs éléments ? */
  private isMultiSelection(): boolean {
    return (this.selection?.items.length ?? 0) > 1;
  }

  clearSelection(): void {
    if (!this.selection) return;
    this.select(undefined);
  }

  /** Construit en arrière-plan la page cible d'un lien, sans l'afficher (SPEC §11.1). */
  preloadLink(link: LinkModel | undefined): void {
    if (link?.type !== 'page' || link.pageId === this.currentPageId) return;
    const page = this.pageById(link.pageId);
    if (page) this.scenes.prebuild(page);
  }

  /**
   * Suit le lien d'un élément de la page courante : transition vers la page cible, ou ouverture
   * de l'URL dans un nouvel onglet. Sans effet si l'élément n'a pas de lien exploitable.
   */
  followLink(elementId: string): void {
    const page = this.getCurrentPage();
    const element = page && [...page.shapes, ...page.edges].find((e) => e.id === elementId);
    const link = element?.link;
    if (!page || !element || !isNavigableLink(link) || this.transition) return;
    if (link.type === 'url') {
      this.openUrl(link.href);
      return;
    }
    const target = this.pageById(link.pageId);
    if (!target || target.id === page.id) return;

    const frame = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.drawnBounds(elementId);
    this.history.push({ pageId: page.id, elementId, frame, camera: this.cameraState, targetPageId: target.id });
    this.events.emit('historyChange', this.history.entries());
    // L'usage ne compte que pour les vrais liens du document (pas les cartes de la vue graphe).
    if (page.id !== GRAPH_PAGE_ID) {
      const at = Date.now();
      this.linkUsage[usageKey(page.id, target.id)] = at;
      this.events.emit('linkUsed', page.id, target.id, at);
    }

    this.runTransition({
      direction: 'in',
      outer: page,
      inner: target,
      frame,
      destination: this.pageCameras.get(target.id) ?? fitBounds(target.bounds, this.viewport, this.orientation()),
    });
  }

  /** Dernière utilisation des liens entre pages du fichier (à persister). */
  getLinkUsage(): LinkUsage {
    return { ...this.linkUsage };
  }

  /** Pile de navigation (de la plus ancienne à la plus récente entrée). */
  getHistory(): HistoryEntry[] {
    return this.history.entries();
  }

  /**
   * Destination de « Retour » (SPEC §11.3) : le haut de la pile si elle mène à la page courante ;
   * sinon les pages parentes (liens vers la page courante), la plus récemment utilisée d'abord.
   */
  getBackTarget(): BackTarget {
    const page = this.getCurrentPage();
    if (!page || !this.document) return { kind: 'none' };
    const entry = this.history.peek();
    if (entry && entry.targetPageId === page.id) {
      const pageName = this.pageById(entry.pageId)?.name ?? entry.pageId;
      return { kind: 'history', entry, pageName };
    }
    const parents = findParents(this.document, page.id, this.linkUsage);
    if (parents.length === 1) return { kind: 'parent', parent: parents[0]! };
    if (parents.length > 1) return { kind: 'choose', parents };
    return { kind: 'none' };
  }

  /**
   * Retour : dépile et revient exactement à la vue d'origine, par la transition inverse
   * (la page courante rétrécit dans la forme d'où l'on venait). Sans historique : un seul parent
   * → on y va ; plusieurs → événement `backChoice` (l'UI propose la liste, puis `backTo`).
   */
  back(): void {
    if (this.transition) return;
    const target = this.getBackTarget();
    if (target.kind === 'history') {
      this.history.pop();
      this.events.emit('historyChange', this.history.entries());
      this.returnTo(target.entry.pageId, target.entry.frame, target.entry.camera);
    } else if (target.kind === 'parent') {
      this.backTo(target.parent.pageId);
    } else if (target.kind === 'choose') {
      this.events.emit('backChoice', target.parents);
    }
  }

  /** Remonte vers une page parente choisie (sortie par la forme qui porte le lien). */
  backTo(parentPageId: string): void {
    const page = this.getCurrentPage();
    if (!page || !this.document || this.transition) return;
    const parent = findParents(this.document, page.id, this.linkUsage).find((p) => p.pageId === parentPageId);
    if (!parent) return;
    // La pile ne mène plus à la page courante : on repart d'une pile vide.
    this.history.clear();
    this.events.emit('historyChange', []);
    this.returnTo(parent.pageId, parent.frame, this.pageCameras.get(parent.pageId));
  }

  private returnTo(pageId: string, frame: Rect | undefined, camera: CameraState | undefined): void {
    const inner = this.getCurrentPage();
    const outer = this.pageById(pageId);
    if (!inner || !outer) return;
    const destination = camera ?? fitBounds(outer.bounds, this.viewport, this.orientation());
    this.runTransition({ direction: 'out', outer, inner, frame, destination });
  }

  /**
   * Transition « zoom + fondu » (SPEC §11.2), dans les deux sens, en un seul trajet de caméra.
   * La page intérieure (`inner`) est posée dans la forme (`frame`) de la page extérieure (`outer`).
   * - `in` : on part de la page extérieure et on plonge jusqu'à la vue `destination` de l'intérieure ;
   * - `out` : on part de la page intérieure (même image, exprimée dans le repère extérieur) et on
   *   recule jusqu'à la vue `destination` de l'extérieure, la page intérieure rétrécissant dans la forme.
   * Fondu croisé entre 25 % et 75 %. Entrées ignorées pendant la transition.
   */
  private runTransition(options: {
    direction: 'in' | 'out';
    outer: PageModel;
    inner: PageModel;
    frame: Rect | undefined;
    destination: CameraState;
  }): void {
    const { direction, outer, inner, frame, destination } = options;
    const from = this.getCurrentPage();
    const to = direction === 'in' ? inner : outer;
    if (!from || this.transition) return;

    if (
      !frame ||
      !this.settings.transition.enabled ||
      this.reducedMotion() ||
      this.settings.transition.durationMs <= 0
    ) {
      if (direction === 'in') this.pageCameras.set(outer.id, this.cameraState);
      this.pageCameras.set(to.id, destination);
      this.goToPage(to.id);
      return;
    }

    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.clearSelection();
    const embedding = embedIn(inner.bounds, frame);
    const outerScene = this.scenes.prebuild(outer);
    const innerScene = this.scenes.prebuild(inner);

    // Caméras de départ et d'arrivée, exprimées dans le repère de la page extérieure.
    const startCamera = direction === 'in' ? this.cameraState : embeddedCamera(this.cameraState, embedding);
    const endCamera = direction === 'in' ? embeddedCamera(destination, embedding) : destination;
    const outerCameraBefore = direction === 'in' ? this.cameraState : undefined;

    // Pendant la transition, la page courante est l'extérieure ; l'intérieure est posée dans la forme.
    this.currentPageId = outer.id;
    this.scenes.show(outer);
    this.minimap?.invalidate();
    innerScene.root.visible = true;
    setPageTransform(innerScene.root, embedding);
    const innerAlpha = (fade: number) => (direction === 'in' ? fade : 1 - fade);
    setPageOpacity(innerScene.root, innerAlpha(0));
    setPageOpacity(outerScene.root, 1 - innerAlpha(0));
    this.applyCamera(startCamera);

    const ease = easing(this.settings.transition.easing);
    const duration = this.settings.transition.durationMs;
    const { fadeStart, fadeEnd } = this.settings.transition;

    this.controller.setEnabled(false);
    this.events.emit('transitionStart', from.id, to.id);

    const restore = () => {
      setPageOpacity(outerScene.root, 1);
      setPageOpacity(innerScene.root, 1);
      setPageTransform(innerScene.root, undefined);
    };
    const finish = () => {
      this.transition = undefined;
      this.animation = 0;
      this.controller.setEnabled(true);
      // Touche toujours maintenue : les zones liées de la page d'arrivée.
      this.updateLinkZones();
      this.events.emit('transitionEnd', this.currentPageId ?? to.id);
    };
    this.transition = {
      abort: () => {
        // On reste sur la page extérieure, à la vue courante.
        cancelAnimationFrame(this.animation);
        restore();
        this.scenes.show(outer);
        finish();
      },
    };
    // Pas de zones liées pendant le trajet.
    this.updateLinkZones();

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      if (t < 1) {
        this.applyCamera(interpolateCamera(startCamera, endCamera, ease(t)));
        const fade = phase(t, fadeStart, fadeEnd);
        setPageOpacity(innerScene.root, innerAlpha(fade));
        setPageOpacity(outerScene.root, 1 - innerAlpha(fade));
        this.animation = requestAnimationFrame(step);
        return;
      }
      // Arrivée : même image à l'écran, sur la page de destination sans transformation.
      restore();
      if (outerCameraBefore) this.pageCameras.set(outer.id, outerCameraBefore);
      this.applyPageIso(to.id);
      this.currentPageId = to.id;
      if (to.id !== GRAPH_PAGE_ID) this.lastDocumentPageId = to.id;
      this.scenes.show(to);
      this.minimap?.invalidate();
      this.applyCamera(destination);
      this.events.emit('pageChange', to);
      finish();
    };
    this.animation = requestAnimationFrame(step);
  }

  // -------------------------------------------------------------------------
  // Édition à la souris (SPEC §14.1) : déplacer, redimensionner, connecter

  /** Page courante modifiable (pas la vue graphe, ni une page illisible) et son arbre XML. */
  private editablePage(): { page: PageModel; pageTree: PageTree } | undefined {
    if (!this.editable) return undefined;
    const page = this.getCurrentPage();
    if (!page || page.id === GRAPH_PAGE_ID || this.transition) return undefined;
    const pageTree = this.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return { page, pageTree };
  }

  /** Forme sélectionnée sur la page courante, si on peut la modifier (poignées affichées). */
  private editableSelection(): { page: PageModel; pageTree: PageTree; shape: ShapeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.selection?.picked;
    if (!editable || picked?.type !== 'shape' || this.selection?.pageId !== editable.page.id) return undefined;
    // Poignées, redimensionnement et connecteur : une seule forme sélectionnée.
    if (this.isMultiSelection()) return undefined;
    const shape = editable.page.shapes.find((s) => s.id === picked.element.id);
    if (!shape || isLocked(shape) || !canMoveCell(editable.pageTree, shape.id)) return undefined;
    return { ...editable, shape };
  }

  /** Flèche sélectionnée seule sur la page courante, si on peut la modifier (poignées de ses bouts). */
  private editableEdgeSelection(): { page: PageModel; pageTree: PageTree; edge: EdgeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.selection?.picked;
    if (!editable || picked?.type !== 'edge' || this.selection?.pageId !== editable.page.id) return undefined;
    if (this.isMultiSelection()) return undefined;
    const edge = editable.page.edges.find((e) => e.id === picked.element.id);
    if (!edge || isLocked(edge) || !editable.pageTree.cells.get(edge.id)?.cell) return undefined;
    return { ...editable, edge };
  }

  /**
   * Flèche dont les poignées sont affichées et saisissables : la flèche modifiable sélectionnée, sauf pendant
   * l'édition de son texte du milieu (les poignées gêneraient la saisie).
   */
  private edgeHandlesSelection(): ReturnType<Engine['editableEdgeSelection']> {
    const editable = this.editableEdgeSelection();
    const editing = this.labelEditing;
    const editingMiddle = editing?.elementId === editable?.edge.id && !editing?.end && !editing?.labelCellId;
    return editingMiddle ? undefined : editable;
  }

  /** Bouts du tracé d'une flèche, en coordonnées page (objet éventuellement décalé en cours de glisser). */
  private edgeEndPoints(edgeId: string): Record<TerminalEnd, Point> | undefined {
    const object = this.sceneObject(edgeId);
    const route = object?.userData.route as Point[] | undefined;
    if (!object || !route || route.length < 2) return undefined;
    const at = (p: Point) => ({ x: p.x + object.position.x, y: p.y + object.position.y });
    return { source: at(route[0]!), target: at(route[route.length - 1]!) };
  }

  /** Bout de la flèche sélectionnée sous un point écran (tolérance des poignées). */
  private edgeEndAt(screen: Point): TerminalEnd | undefined {
    const edge = this.edgeHandlesSelection()?.edge;
    const ends = edge && this.edgeEndPoints(edge.id);
    if (!edge || !ends) return undefined;
    const top = this.elementTop(edge.id);
    let best: { end: TerminalEnd; distance: number } | undefined;
    for (const end of ['target', 'source'] as const) {
      const at = this.screenOfPoint(ends[end], top);
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
      if (distance <= this.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { end, distance };
    }
    return best?.end;
  }

  /** Ce que les poignées entre les bouts savent de la flèche (tracé brut affiché, formes, points d'appui). */
  private pointsContext(page: PageModel, edge: EdgeModel): PointsContext | undefined {
    const object = this.sceneObject(edge.id);
    const raw = object?.userData.points as Point[] | undefined;
    if (!object || !raw || raw.length < 2) return undefined;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const source = toTerminal(shapes.get(edge.sourceId ?? ''));
    const target = toTerminal(shapes.get(edge.targetId ?? ''));
    const sourceFixed = source && fixedAnchor(source, edge.style, 'source');
    const targetFixed = target && fixedAnchor(target, edge.style, 'target');
    const { zoom } = this.cameraState;
    return {
      editor: pointsEditor(edge.style),
      route: raw.map((p) => ({ x: p.x + object.position.x, y: p.y + object.position.y })),
      waypoints: edge.points.map((p) => ({ ...p })),
      source: source?.bounds,
      target: target?.bounds,
      sourceAnchor: sourceFixed ?? (source && routingCenter(source)),
      targetAnchor: targetFixed ?? (target && routingCenter(target)),
      sourceFixed: !!sourceFixed,
      targetFixed: !!targetFixed,
      reroute: (waypoints) =>
        routeEdgePoints({
          source,
          target,
          sourcePoint: edge.sourcePoint,
          targetPoint: edge.targetPoint,
          waypoints,
          style: edge.style,
        }),
      tolerance: EDGE_POINT_TOLERANCE / zoom,
      handleRadius: (this.settings.edit.handleSize * 1.5) / zoom,
    };
  }

  /** Poignée entre les bouts de la flèche sélectionnée sous un point écran. */
  private pointHandleAt(screen: Point): PointHandle | undefined {
    const editable = this.edgeHandlesSelection();
    const context = editable && this.pointsContext(editable.page, editable.edge);
    if (!editable || !context) return undefined;
    const top = this.elementTop(editable.edge.id);
    let best: { handle: PointHandle; distance: number } | undefined;
    for (const handle of pointHandles(context)) {
      const at = this.screenOfPoint(handle.point, top);
      // À distance égale, une vraie poignée passe avant une poignée en transparence.
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y) + (handle.faded ? 0.5 : 0);
      if (distance <= this.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { handle, distance };
    }
    return best?.handle;
  }

  /** Curseur d'une poignée entre les bouts (segment : perpendiculaire à lui). */
  private pointHandleCursor(handle: PointHandle, style: Record<string, string>): string {
    if (handle.kind === 'segment') return handle.vertical ? 'col-resize' : 'row-resize';
    if (handle.kind === 'elbow')
      return style.edgeStyle === 'topToBottomEdgeStyle' ||
        (style.edgeStyle === 'elbowEdgeStyle' && style.elbow === 'vertical')
        ? 'row-resize'
        : 'col-resize';
    return 'move';
  }

  /** Écrit les points intermédiaires d'une flèche (repère de son parent, comme draw.io). */
  private writeEdgePoints(page: PageModel, pageTree: PageTree, edge: EdgeModel, points: Point[]): void {
    const origin = page.shapes.find((s) => s.id === edge.parentId)?.bounds ?? { x: 0, y: 0 };
    setEdgePoints(
      pageTree,
      edge.id,
      points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
    );
  }

  /**
   * Retour en auto : points intermédiaires et points d'attache imposés retirés, la flèche reste reliée
   * aux mêmes formes (le tracé redevient entièrement calculé).
   */
  resetEdgeRoute(edgeId: string): void {
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge) return;
    const keys = ['exit', 'entry'].flatMap((prefix) =>
      ['X', 'Y', 'Dx', 'Dy', 'Perimeter'].map((suffix) => `${prefix}${suffix}`),
    );
    const constrained = keys.some((key) => edge.style[key] !== undefined);
    if (edge.points.length === 0 && !constrained) return;
    this.recordEdit('Tracé automatique');
    setEdgePoints(editable.pageTree, edge.id, []);
    for (const key of keys) setCellStyleValue(editable.pageTree, edge.id, key, undefined);
    this.documentChanged([editable.page.id]);
  }

  /**
   * Accroche d'un bout de flèche sous le pointeur, comme draw.io : point de connexion proche (attache
   * fixe), sinon intérieur d'une forme (attache auto), sinon un point libre au niveau de la flèche.
   */
  private endAttachmentAt(
    page: PageModel,
    screen: Point,
    options: { exclude?: string; height: number; snap: boolean; grid: number },
  ): EndAttachment {
    const shapes = connectableShapes(page).filter((s) => s.id !== options.exclude);
    let best: { shapeId: string; index: number; distance: number } | undefined;
    for (const shape of shapes) {
      const top = this.elementTop(shape.id);
      connectionPoints(shape.bounds).forEach((point, index) => {
        const at = this.screenOfPoint(point, top);
        const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
        if (distance <= this.settings.edit.handlePickTolerance * 1.5 && (!best || distance < best.distance))
          best = { shapeId: shape.id, index, distance };
      });
    }
    if (best) return { kind: 'fixed', shapeId: best.shapeId, constraint: { ...CONNECTION_POINTS[best.index]! } };
    const shape = this.shapeAt(screen, options.exclude);
    if (shape) return { kind: 'floating', shapeId: shape.id };
    const point = this.groundPointAtHeight(screen, options.height);
    const step = options.snap && options.grid > 0 ? options.grid : 1;
    return { kind: 'free', point: { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step } };
  }

  /** Forme sous un point écran à laquelle on peut attacher une flèche (les flèches sont ignorées). */
  private shapeAt(screen: Point, exclude?: string): ShapeModel | undefined {
    const page = this.getCurrentPage();
    if (!page) return undefined;
    const connectable = new Set(connectableShapes(page).map((s) => s.id));
    const picked = pickElement(
      { ...page, shapes: page.shapes.filter((s) => connectable.has(s.id) && s.id !== exclude), edges: [] },
      screenToPage(this.cameraState, this.viewport, screen),
      {
        edgeTolerance: 0,
        edgeRoute: () => undefined,
        heightOf: (id) => this.elementTop(id),
        pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
        outlineOf: (shape) => this.shapeOutline(shape),
      },
    );
    return picked?.type === 'shape' ? picked.element : undefined;
  }

  /** Repères d'accroche (contour, points de connexion) sur la forme visée par un bout de flèche. */
  private showConnectionHints(page: PageModel, attachment: EndAttachment | undefined, extra?: Object3D): void {
    this.clearConnectorPreview();
    const root = this.scenes.current?.root;
    if (!root) return;
    const group = new Group();
    group.name = 'connector-preview';
    if (extra) group.add(extra);
    const shape =
      attachment && attachment.kind !== 'free' ? page.shapes.find((s) => s.id === attachment.shapeId) : undefined;
    if (shape && attachment?.kind !== 'free') {
      const active =
        attachment?.kind === 'fixed'
          ? CONNECTION_POINTS.findIndex((c) => c.x === attachment.constraint.x && c.y === attachment.constraint.y)
          : undefined;
      const hints = connectionHints(
        { bounds: shape.bounds, ellipse: shape.kind === 'ellipse' },
        connectionPoints(shape.bounds),
        this.cameraState.zoom,
        { active, outline: attachment?.kind === 'floating', accent: this.settings.selection.accentColor },
      );
      hints.position.z = this.elementTop(shape.id) + 0.3;
      group.add(hints);
    }
    group.traverse((o) => {
      o.renderOrder = Number.MAX_SAFE_INTEGER;
      if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
    });
    this.connectorPreview = group;
    root.add(group);
    this.requestRender();
  }

  /** Point écran d'un point de la page posé à `height` au-dessus du sol (inverse de `groundPointAtHeight`). */
  private screenOfPoint(point: Point, height: number): Point {
    return pageToScreen(this.cameraState, this.viewport, point, height);
  }

  /** Poignée de la sélection sous un point écran (8 px de tolérance). */
  private handleAt(screen: Point): HandleKind | undefined {
    const editable = this.editableSelection();
    if (!editable) return undefined;
    const { shape } = editable;
    const top = this.elementTop(shape.id);
    const resizable = shape.kind !== 'group';
    let best: { kind: HandleKind; distance: number } | undefined;
    for (const { kind, point } of handlePoints(shape.bounds, this.cameraState.zoom)) {
      if (kind !== 'connect' && !resizable) continue;
      const at = this.screenOfPoint(point, top);
      const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
      if (distance <= this.settings.edit.handlePickTolerance && (!best || distance < best.distance))
        best = { kind, distance };
    }
    return best?.kind;
  }

  /**
   * Appui gauche : sur une poignée de la sélection, prépare un redimensionnement ou un connecteur ;
   * sur une forme déplaçable, prépare son déplacement.
   */
  private beginMove(screen: Point): boolean {
    const editable = this.editablePage();
    if (!editable) return false;
    const { page, pageTree } = editable;
    const start = screenToPage(this.cameraState, this.viewport, screen);
    const grid = gridSizeOf(pageTree);

    const end = this.edgeEndAt(screen);
    const selectedEdge = end ? this.editableEdgeSelection()?.edge : undefined;
    if (end && selectedEdge) {
      this.drag = {
        kind: 'edgeEnd',
        pageId: page.id,
        edgeId: selectedEdge.id,
        end,
        original: snapshotEnds(selectedEdge),
        started: false,
      };
      return true;
    }

    const pointHandle = this.pointHandleAt(screen);
    const bentEdge = pointHandle ? this.editableEdgeSelection()?.edge : undefined;
    const context = bentEdge && this.pointsContext(page, bentEdge);
    if (pointHandle && bentEdge && context) {
      this.drag = {
        kind: 'edgePoints',
        pageId: page.id,
        edgeId: bentEdge.id,
        handle: pointHandle,
        context,
        original: bentEdge.points.map((p) => ({ ...p })),
        started: false,
      };
      return true;
    }

    const handle = this.handleAt(screen);
    const selected = handle ? this.editableSelection()?.shape : undefined;
    if (handle && selected) {
      this.drag =
        handle === 'connect'
          ? { kind: 'connect', pageId: page.id, sourceId: selected.id, started: false }
          : {
              kind: 'resize',
              pageId: page.id,
              shapeId: selected.id,
              handle,
              start,
              origin: { ...selected.bounds },
              grid,
              children: collectMoveSet(page, selected.id),
              started: false,
            };
      return true;
    }

    const picked = this.pickAt(screen);
    if (picked?.type !== 'shape') return false;
    const shape = moveTarget(page, picked.element);
    if (isLocked(shape) || !canMoveCell(pageTree, shape.id)) return false;
    // Forme saisie dans une sélection multiple : toutes les formes sélectionnées bougent ensemble
    // (celles qu'on ne peut pas déplacer restent en place).
    const selection = this.selection;
    const grabbedSelected =
      this.isMultiSelection() &&
      selection?.pageId === page.id &&
      selection.items.some((item) => item.type === 'shape' && moveTarget(page, item.element).id === shape.id);
    const candidates = grabbedSelected
      ? [
          shape.id,
          ...selection!.items
            .filter((item) => item.type === 'shape')
            .map((item) => moveTarget(page, item.element))
            .filter((target) => !isLocked(target) && canMoveCell(pageTree, target.id))
            .map((target) => target.id),
        ]
      : [shape.id];
    const sets = new Map<string, MoveSet>();
    const setOf = (id: string) => {
      if (!sets.has(id)) sets.set(id, collectMoveSet(page, id));
      return sets.get(id)!;
    };
    const rootIds = independentRoots(candidates, (id) => setOf(id).shapeIds);
    const set = unionMoveSets(rootIds.map(setOf));
    // Flèches de la sélection qui bougent d'elles-mêmes (une flèche d'un groupe déplacé suit déjà).
    const edges: MoveDrag['edges'] = [];
    if (grabbedSelected) {
      for (const item of selection!.items) {
        if (item.type !== 'edge') continue;
        const edge = page.edges.find((e) => e.id === item.element.id);
        if (!edge || isLocked(edge) || !pageTree.cells.get(edge.id)?.cell || set.edgeIds.has(edge.id)) continue;
        const detach = (['source', 'target'] as const)
          .filter((end) => {
            const terminal = end === 'source' ? edge.sourceId : edge.targetId;
            return terminal !== undefined && !set.shapeIds.has(terminal);
          })
          .map((end) => ({ end }));
        edges.push({ id: edge.id, detach });
        set.edgeIds.add(edge.id);
        set.connectedEdgeIds.delete(edge.id);
      }
    }
    this.drag = {
      kind: 'move',
      pageId: page.id,
      rootIds,
      set,
      edges,
      start,
      origin: { ...shape.bounds },
      applied: { x: 0, y: 0 },
      grid,
      started: false,
    };
    return true;
  }

  /**
   * Suit le pointeur, mesuré au sol (projection orthographique, identique à toute hauteur : une
   * forme en volume reste sous le curseur). Modèle et scène sont mis à jour en place.
   */
  private moveTo(screen: Point, snap: boolean): void {
    const drag = this.drag;
    const page = this.getCurrentPage();
    if (!drag || page?.id !== drag.pageId) return;
    const point = screenToPage(this.cameraState, this.viewport, screen);
    if (drag.kind === 'move') this.dragMove(page, drag, point, snap);
    else if (drag.kind === 'resize') this.dragResize(page, drag, point, snap);
    else if (drag.kind === 'label') this.dragLabel(page, drag, screen);
    else if (drag.kind === 'edgeEnd') this.dragEdgeEnd(page, drag, screen, snap);
    else if (drag.kind === 'edgePoints') this.dragEdgePoints(page, drag, screen, snap);
    else this.dragConnect(page, drag, screen);
  }

  /** Texte de flèche suivant le pointeur : le point du tracé le plus proche, et l'écart de côté. */
  private dragLabel(page: PageModel, drag: LabelDrag, screen: Point): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const route = this.sceneObject(drag.edgeId)?.userData.route as Point[] | undefined;
    if (!edge || !route?.length) return;
    drag.started = true;
    const point = this.groundPointAtHeight(screen, this.elementTop(drag.edgeId));
    const placement = placementAt(route, point, drag.offset);
    drag.placement = placement;
    setEdgeTextPlacement(edge, drag.cellId, placement);
    this.retraceEdges(page, new Set([edge.id]));
    this.afterLiveEdit();
  }

  /**
   * Ancre un texte de flèche au début, au milieu ou à la fin du tracé (à 10 % du bout pour le début et
   * la fin, comme les textes créés), sur le tracé (distance et décalage remis à zéro).
   */
  /**
   * Édition en place d'un texte existant d'une flèche (son label ou un label enfant), où qu'il soit
   * placé : double-clic sur le texte.
   */
  editEdgeText(edgeId: string, cellId: string): void {
    if (cellId === edgeId) {
      this.editLabel(edgeId);
      return;
    }
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    const label = edge?.labels.find((l) => l.id === cellId);
    const screen = label && this.labelEditScreen(edgeId, undefined, cellId);
    if (!editable || !edge || !label || !screen) return;
    const anchor = anchorOf(label.placement);
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: edgeId,
      end: anchor === 'middle' ? undefined : anchor,
      labelCellId: cellId,
      text: label.label,
      screen,
      styleCellId: cellId,
      style: label.style,
      html: label.style.html === '1' ? cellLabelValue(editable.pageTree, cellId) : undefined,
      scale: this.textScale(edgeId),
      onEdge: true,
      ...this.labelEditBackdrop(label.style, true),
    });
  }

  /**
   * Texte d'une flèche : son label (`cellId` = l'arête) ou un label enfant, retiré si le texte est vide ;
   * HTML draw.io s'il a une mise en forme partielle.
   */
  setEdgeText(edgeId: string, cellId: string, text: string, html?: string): void {
    if (cellId === edgeId) {
      this.setLabel(edgeId, text, html);
      return;
    }
    const editable = this.editablePage();
    const label = editable?.page.edges.find((e) => e.id === edgeId)?.labels.find((l) => l.id === cellId);
    if (!editable || !label) return;
    const value = text.trim() === '' ? '' : text;
    const rich = value ? html : undefined;
    const unchanged =
      rich === undefined ? label.label === value && !label.rich : cellLabelValue(editable.pageTree, cellId) === rich;
    if (unchanged) return;
    this.recordEdit('Texte');
    if (!value) removeCells(editable.pageTree, [cellId]);
    else if (rich === undefined) setCellLabel(editable.pageTree, cellId, value);
    else setCellRichLabel(editable.pageTree, cellId, rich);
    this.documentChanged([editable.page.id]);
  }

  /**
   * Déplace le texte de flèche en cours d'édition (poignée sous l'éditeur) : `screen` est le point visé
   * pour le texte (son ancre). Suivi en direct ; `endEditedTextMove` l'écrit dans le fichier.
   */
  moveEditedText(screen: Point): void {
    const editing = this.labelEditing;
    const page = this.getCurrentPage();
    const cellId = editing?.styleCellId;
    if (!editing?.onEdge || !cellId || !page || editing.pageId !== page.id) return;
    const edge = page.edges.find((e) => e.id === editing.elementId);
    if (!edge) return;
    if (this.drag?.kind !== 'label') {
      const current = cellId === edge.id ? edge.labelPlacement : edge.labels.find((l) => l.id === cellId)?.placement;
      if (!current) return;
      this.drag = { kind: 'label', pageId: page.id, edgeId: edge.id, cellId, offset: current.offset, started: false };
    }
    this.dragLabel(page, this.drag, screen);
    this.hideEditedLabel();
    this.relocateLabelEdit();
  }

  /** Fin du déplacement du texte en cours d'édition : une étape d'annulation, écrite comme draw.io. */
  endEditedTextMove(): void {
    if (this.drag?.kind !== 'label') return;
    this.endMove();
    this.relocateLabelEdit();
  }

  /**
   * Texte de flèche sous un point écran (sa boîte de texte dessinée, où qu'il soit placé) : le plus
   * haut dans l'ordre de dessin. Cliquer un texte éloigné de sa flèche la sélectionne.
   */
  private edgeTextAt(screen: Point): { edge: EdgeModel; cellId: string } | undefined {
    const page = this.getCurrentPage();
    const root = this.scenes.current?.root;
    if (!page || !root) return undefined;
    root.updateMatrixWorld();
    const toPage = new Matrix4().copy(root.matrixWorld).invert();
    const padding = 2 / this.cameraState.zoom;
    for (const edge of [...page.edges].reverse()) {
      const object = this.sceneObject(edge.id);
      if (!object?.visible) continue;
      const point = this.groundPointAtHeight(screen, this.elementTop(edge.id));
      let hit: string | undefined;
      object.traverse((child) => {
        const cellId = child.userData.labelCellId as string | undefined;
        if (hit || !cellId || !child.visible) return;
        const box = drawnTextBox(child, toPage);
        if (
          box &&
          point.x >= box.min.x - padding &&
          point.x <= box.max.x + padding &&
          point.y >= box.min.y - padding &&
          point.y <= box.max.y + padding
        )
          hit = cellId;
      });
      if (hit) return { edge, cellId: hit };
    }
    return undefined;
  }

  setEdgeTextAnchor(edgeId: string, cellId: string, anchor: EdgeTextAnchor): void {
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge || !edgeTexts(edge).some((text) => text.cellId === cellId)) return;
    const route = this.sceneObject(edgeId)?.userData.route as Point[] | undefined;
    if (!route?.length) return;
    // Même configuration qu'un texte créé à cet endroit : placement et alignement.
    const layout = edgeTextLayout(route, anchor, false, this.endTextGap());
    this.recordEdit('Position du texte');
    setLabelPlacement(editable.pageTree, cellId, layout.placement);
    const centered = anchor === 'middle';
    setCellStyleValue(editable.pageTree, cellId, 'align', centered ? undefined : layout.align);
    setCellStyleValue(editable.pageTree, cellId, 'verticalAlign', centered ? undefined : layout.verticalAlign);
    this.documentChanged([editable.page.id]);
  }

  /** Écarts du placement par défaut des textes de début / fin (paramètres). */
  private endTextGap(): EndTextGap {
    return { along: this.settings.shapes.edgeEndTextGapAlong, across: this.settings.shapes.edgeEndTextGapAcross };
  }

  /** Configuration par défaut d'un texte de début / fin d'une flèche de la page courante. */
  private endTextLayout(edgeId: string, end: EdgeEnd, flipped = false): EdgeTextLayout {
    const route = (this.sceneObject(edgeId)?.userData.route as Point[] | undefined) ?? [];
    return edgeTextLayout(route, end, flipped, this.endTextGap());
  }

  /** Demande d'édition complétée de la bascule possible (texte de début / fin en configuration par défaut). */
  private withFlip(request: LabelEditRequest): LabelEditRequest {
    const edge = this.getCurrentPage()?.edges.find((e) => e.id === request.elementId);
    const route = this.sceneObject(request.elementId)?.userData.route as Point[] | undefined;
    const rest = { ...request };
    delete rest.flip;
    if (!request.onEdge || !request.end || !edge || !route?.length) return rest;
    const child = request.labelCellId ? edge.labels.find((l) => l.id === request.labelCellId) : undefined;
    const placement =
      child?.placement ?? edgeTextLayout(route, request.end, request.flipped, this.endTextGap()).placement;
    const target = flipTarget(route, request.end, placement, child?.style ?? request.style, this.endTextGap());
    return target ? { ...rest, flip: target.direction } : rest;
  }

  /**
   * Fait sauter le texte de début / fin en cours d'édition de l'autre côté du trait (règle inversée), s'il
   * est dans une configuration par défaut ; un texte encore à créer sera créé de ce côté.
   */
  flipEditedText(): void {
    const editing = this.labelEditing;
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === editing?.elementId);
    const route = edge && (this.sceneObject(edge.id)?.userData.route as Point[] | undefined);
    if (!editing?.onEdge || !editing.end || !editable || !edge || !route?.length) return;
    const child = editing.labelCellId ? edge.labels.find((l) => l.id === editing.labelCellId) : undefined;
    let next: LabelEditRequest;
    if (child) {
      const target = flipTarget(route, editing.end, child.placement, child.style, this.endTextGap());
      if (!target) return;
      this.recordEdit('Côté du texte');
      setLabelPlacement(editable.pageTree, child.id, target.layout.placement);
      setCellStyleValue(editable.pageTree, child.id, 'align', target.layout.align);
      setCellStyleValue(editable.pageTree, child.id, 'verticalAlign', target.layout.verticalAlign);
      this.documentChanged([editable.page.id]);
      const style = this.getCurrentPage()
        ?.edges.find((e) => e.id === edge.id)
        ?.labels.find((l) => l.id === child.id)?.style;
      next = { ...editing, style: style ?? editing.style };
    } else {
      const flipped = !editing.flipped;
      const layout = edgeTextLayout(route, editing.end, flipped, this.endTextGap());
      next = {
        ...editing,
        flipped,
        style: { ...editing.style, align: layout.align, verticalAlign: layout.verticalAlign },
      };
    }
    const screen = this.labelEditScreen(next.elementId, next.end, next.labelCellId, next.flipped);
    this.labelEditing = this.withFlip({ ...next, screen: screen ?? next.screen });
    this.events.emit('labelEdit', this.labelEditing);
  }

  /** Style d'un texte de début / fin créé : taille et couleur (paramètres), alignement de sa configuration. */
  private endTextStyle(layout: EdgeTextLayout): Record<string, string> {
    return {
      fontSize: String(this.settings.shapes.edgeEndTextSize),
      fontColor: this.settings.shapes.edgeEndTextColor,
      align: layout.align,
      verticalAlign: layout.verticalAlign,
    };
  }

  private dragMove(page: PageModel, move: MoveDrag, point: Point, snap: boolean): void {
    if (!move.started) {
      move.started = true;
      // Une forme seule devient la sélection ; une sélection multiple déplacée reste telle quelle.
      const shape = page.shapes.find((s) => s.id === move.set.rootId);
      if (shape && move.rootIds.length === 1 && move.edges.length === 0) this.select({ type: 'shape', element: shape });
      // Bouts détachés : libres là où ils sont, avant le premier pas.
      const detached = new Set<string>();
      for (const moved of move.edges) {
        const edge = page.edges.find((e) => e.id === moved.id);
        const ends = this.edgeEndPoints(moved.id);
        if (!edge || !ends) continue;
        for (const item of moved.detach) {
          item.point = { ...ends[item.end] };
          if (item.end === 'source') {
            edge.sourceId = undefined;
            edge.sourcePoint = { ...item.point };
          } else {
            edge.targetId = undefined;
            edge.targetPoint = { ...item.point };
          }
          detached.add(edge.id);
        }
      }
      this.retraceEdges(page, detached);
    }
    const raw = { x: point.x - move.start.x, y: point.y - move.start.y };
    const target = snapDelta(move.origin, raw, snap ? move.grid : 0);
    const step = { x: target.x - move.applied.x, y: target.y - move.applied.y };
    if (step.x === 0 && step.y === 0) return;
    move.applied = target;
    translateMoveSet(page, move.set, step);
    this.translateObjects(move.set, step);
    this.retraceEdges(page, move.set.connectedEdgeIds);
    this.afterLiveEdit();
  }

  private dragResize(page: PageModel, resize: ResizeDrag, point: Point, snap: boolean): void {
    const shape = page.shapes.find((s) => s.id === resize.shapeId);
    if (!shape) return;
    resize.started = true;
    const delta = { x: point.x - resize.start.x, y: point.y - resize.start.y };
    const bounds = resizeBounds(
      resize.origin,
      resize.handle,
      delta,
      snap ? resize.grid : 0,
      this.settings.edit.minShapeSize,
    );
    const previous = shape.bounds;
    if (
      bounds.x === previous.x &&
      bounds.y === previous.y &&
      bounds.width === previous.width &&
      bounds.height === previous.height
    ) {
      return;
    }
    // Le contenu garde sa place relative au coin haut-gauche (comme les enfants d'un conteneur draw.io).
    const step = { x: bounds.x - previous.x, y: bounds.y - previous.y };
    const content: MoveSet = { ...resize.children, shapeIds: new Set(resize.children.shapeIds) };
    content.shapeIds.delete(shape.id);
    translateMoveSet(page, content, step);
    this.translateObjects(content, step);
    shape.bounds = bounds;
    page.bounds = computeBounds(page.shapes, page.edges);
    this.rebuildShapeObject(shape);
    this.retraceEdges(page, resize.children.connectedEdgeIds);
    this.afterLiveEdit();
  }

  private dragConnect(page: PageModel, connect: ConnectDrag, screen: Point): void {
    const source = page.shapes.find((s) => s.id === connect.sourceId);
    if (!source) return;
    connect.started = true;
    const top = this.elementTop(source.id);
    const attachment = this.endAttachmentAt(page, screen, { exclude: source.id, height: top, snap: false, grid: 0 });
    connect.target = attachment.kind === 'free' ? undefined : attachment;
    const target = connect.target && page.shapes.find((s) => s.id === connect.target!.shapeId);
    const end =
      connect.target?.kind === 'fixed' && target
        ? {
            x: target.bounds.x + connect.target.constraint.x * target.bounds.width,
            y: target.bounds.y + connect.target.constraint.y * target.bounds.height,
          }
        : target
          ? { x: target.bounds.x + target.bounds.width / 2, y: target.bounds.y + target.bounds.height / 2 }
          : this.groundPointAtHeight(screen, top);
    const from = { x: source.bounds.x + source.bounds.width / 2, y: source.bounds.y + source.bounds.height / 2 };
    const line = connectorPreview(from, end, this.cameraState.zoom, this.settings.selection.accentColor);
    line.position.z = top + 0.2;
    this.showConnectionHints(page, connect.target, line);
  }

  /** Bout de flèche suivant le pointeur : tracé recalculé en direct, repères sur la forme visée. */
  /** Poignée entre les bouts suivant le pointeur (aimanté à la grille) : points recalculés, tracé en direct. */
  private dragEdgePoints(page: PageModel, drag: EdgePointsDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const raw = this.groundPointAtHeight(screen, this.elementTop(edge.id));
    const grid = gridSizeOf(pageTree);
    const step = snap && grid > 0 ? grid : 1;
    const pointer = { x: Math.round(raw.x / step) * step, y: Math.round(raw.y / step) * step };
    const points = dragPoints(drag.context, drag.handle, pointer);
    if (drag.points && samePoints(points, drag.points)) return;
    drag.points = points;
    edge.points = points;
    this.retraceEdges(page, new Set([edge.id]));
    this.afterLiveEdit();
  }

  private dragEdgeEnd(page: PageModel, drag: EdgeEndDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const attachment = this.endAttachmentAt(page, screen, {
      height: this.elementTop(edge.id),
      snap,
      grid: gridSizeOf(pageTree),
    });
    this.showConnectionHints(page, attachment);
    if (sameAttachment(attachment, drag.attachment)) return;
    drag.attachment = attachment;
    restoreEnds(edge, drag.original);
    applyEndAttachment(edge, drag.end, attachment);
    this.retraceEdges(page, new Set([edge.id]));
    this.afterLiveEdit();
  }

  private clearConnectorPreview(): void {
    if (!this.connectorPreview) return;
    this.connectorPreview.removeFromParent();
    disposeObject(this.connectorPreview);
    this.connectorPreview = undefined;
  }

  /** Fin du glisser : la modification est écrite dans l'arbre XML (seuls les attributs concernés). */
  private endMove(): void {
    const drag = this.drag;
    this.drag = undefined;
    this.clearConnectorPreview();
    if (!drag?.started || !this.document || !this.xmlTree) return;
    const pageTree = this.pageTreeOf(drag.pageId);
    if (!pageTree) return;

    if (drag.kind === 'label') {
      if (!drag.placement) return;
      this.recordEdit('Position du texte');
      setLabelPlacement(pageTree, drag.cellId, drag.placement);
      this.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'edgePoints') {
      const page = this.pageById(drag.pageId);
      const edge = page?.edges.find((e) => e.id === drag.edgeId);
      if (!page || !edge) return;
      if (!drag.points || samePoints(drag.points, drag.original)) {
        edge.points = drag.original;
        if (this.getCurrentPage()?.id === drag.pageId) this.retraceEdges(page, new Set([edge.id]));
        this.afterLiveEdit();
        return;
      }
      this.recordEdit('Points de la flèche');
      this.writeEdgePoints(page, pageTree, edge, drag.points);
      this.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'edgeEnd') {
      const page = this.pageById(drag.pageId);
      const edge = page?.edges.find((e) => e.id === drag.edgeId);
      if (!page || !edge) return;
      const before = endAttachmentOf({ ...edge, ...drag.original }, drag.end);
      const after = drag.attachment;
      if (!after || sameAttachment(after, before)) {
        restoreEnds(edge, drag.original);
        if (this.getCurrentPage()?.id === drag.pageId) this.retraceEdges(page, new Set([edge.id]));
        this.afterLiveEdit();
        return;
      }
      this.recordEdit('Extrémité de flèche');
      writeEndAttachment(pageTree, page, edge, drag.end, after);
      this.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'connect') {
      if (!drag.target) {
        this.requestRender();
        return;
      }
      this.recordEdit('Connecteur');
      const line = CONNECTOR_STYLE + EDGE_LINE_KEYS[this.settings.shapes.edgeLineStyle];
      let style = withStyleValue(line, 'fontSize', String(this.settings.shapes.textSize));
      if (drag.target.kind === 'fixed')
        for (const [key, value] of Object.entries(constraintStyle('target', drag.target.constraint)))
          if (value !== undefined) style = withStyleValue(style, key, value);
      const id = addEdgeCell(pageTree, { source: drag.sourceId, target: drag.target.shapeId, style });
      this.documentChanged([drag.pageId]);
      const edge = this.getCurrentPage()?.edges.find((e) => e.id === id);
      if (edge) this.select({ type: 'edge', element: edge });
      return;
    }

    if (drag.kind === 'move') {
      if (drag.applied.x === 0 && drag.applied.y === 0) return;
      this.recordEdit('Déplacement');
      for (const id of drag.rootIds) moveCell(pageTree, id, drag.applied);
      const page = this.pageById(drag.pageId);
      for (const moved of drag.edges) {
        moveEdgeCell(pageTree, moved.id, drag.applied);
        const edge = page?.edges.find((e) => e.id === moved.id);
        const origin = page?.shapes.find((s) => s.id === edge?.parentId)?.bounds ?? { x: 0, y: 0 };
        for (const { end, point } of moved.detach) {
          if (!point) continue;
          setEdgeTerminal(pageTree, moved.id, end, {
            point: { x: point.x + drag.applied.x - origin.x, y: point.y + drag.applied.y - origin.y },
          });
        }
      }
      // Bouts détachés : le modèle est relu de l'arbre (attributs `source` / `target` retirés).
      if (drag.edges.some((moved) => moved.detach.length > 0)) {
        this.documentChanged([drag.pageId]);
        return;
      }
    } else {
      const shape = this.pageById(drag.pageId)?.shapes.find((s) => s.id === drag.shapeId);
      if (!shape) return;
      const { origin } = drag;
      const delta = {
        x: shape.bounds.x - origin.x,
        y: shape.bounds.y - origin.y,
        width: shape.bounds.width - origin.width,
        height: shape.bounds.height - origin.height,
      };
      if (Object.values(delta).every((d) => d === 0)) return;
      this.recordEdit('Redimensionnement');
      resizeCell(pageTree, drag.shapeId, delta);
    }
    // Scènes de cette page à d'autres niveaux, et vue graphe (miniatures) : à reconstruire.
    this.scenes.invalidate(drag.pageId);
    this.scenes.invalidate(GRAPH_PAGE_ID);
    this.graph = undefined;
    this.minimap?.invalidate();
    this.syncModified();
  }

  private translateObjects(set: MoveSet, step: Point): void {
    for (const object of this.scenes.current?.root.children ?? []) {
      const id = object.userData.elementId as string | undefined;
      if (id && (set.shapeIds.has(id) || set.edgeIds.has(id))) {
        object.position.x += step.x;
        object.position.y += step.y;
      }
    }
  }

  /** Après une modification en direct : contour, poignées, voile et mini-carte à jour. */
  private afterLiveEdit(): void {
    // Le voile met en valeur des objets précis : il est reconstruit (objets remplacés).
    this.clearVeil();
    this.updateSelectionOutline();
    this.minimap?.invalidate();
    this.requestRender();
  }

  /** Remplace l'objet d'une forme (taille changée), à la même hauteur et dans le même ordre de dessin. */
  private rebuildShapeObject(shape: ShapeModel): void {
    const root = this.scenes.current?.root;
    const old = this.sceneObject(shape.id);
    if (!root || !old) return;
    const base = old.position.z;
    const height = ((old.userData.top as number | undefined) ?? base) - base;
    const object = createShapeObject(shape, this.registry, this.renderContext(), this.scenes.current!.level, {
      base,
      height,
    });
    object.userData.elementId = shape.id;
    this.replaceObject(old, object, root);
  }

  /** Reconstruit les arêtes reliées à des formes modifiées (même ordre de dessin, même hauteur). */
  private retraceEdges(page: PageModel, edgeIds: Set<string>): void {
    const root = this.scenes.current?.root;
    if (!root || edgeIds.size === 0) return;
    const shapes = new Map(page.shapes.map((shape) => [shape.id, shape]));
    for (const edge of page.edges) {
      if (!edgeIds.has(edge.id)) continue;
      const old = this.sceneObject(edge.id);
      if (!old) continue;
      const object = createEdge(
        edge,
        { source: shapes.get(edge.sourceId ?? ''), target: shapes.get(edge.targetId ?? '') },
        this.renderContext(),
      );
      object.position.z = old.position.z;
      object.userData.elementId = edge.id;
      object.userData.top = old.userData.top;
      this.replaceObject(old, object, root);
    }
  }

  private replaceObject(old: Object3D, object: Object3D, root: Object3D): void {
    // Hors voile, la racine d'un élément porte son rang dans l'ordre de dessin. Sous le voile, elle
    // porte en plus la mise en avant : on la retire d'abord (le voile est remis par `afterLiveEdit`),
    // sinon le nouvel objet la garderait, et chaque pas d'un glisser l'ajouterait encore.
    this.clearVeil();
    placeInDrawOrder(object, old.renderOrder);
    old.removeFromParent();
    disposeObject(old);
    root.add(object);
  }

  // -------------------------------------------------------------------------
  // Édition par commandes (SPEC §14.1) : label, lien, suppression, annuler / rétablir

  /**
   * Demande d'édition du label d'un élément de la page courante (double-clic, F2) : l'UI reçoit
   * le texte et l'emprise à l'écran (événement `labelEdit`), puis appelle `setLabel`.
   */
  editLabel(elementId?: string): void {
    const editable = this.editablePage();
    const id = elementId ?? this.selection?.picked.element.id;
    const element =
      editable && id ? [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === id) : undefined;
    if (!editable || !element || !editable.pageTree.cells.get(element.id)?.cell) return;
    const rect = this.labelEditScreen(element.id);
    if (!rect) return;
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: element.id,
      text: element.label,
      screen: rect,
      plane: this.labelEditPlane(element.id),
      styleCellId: element.id,
      style: element.style,
      html: element.style.html === '1' ? cellLabelValue(editable.pageTree, element.id) : undefined,
      scale: this.textScale(element.id),
      onEdge: editable.page.edges.some((e) => e.id === element.id),
      ...this.labelEditBackdrop(
        element.style,
        editable.page.edges.some((e) => e.id === element.id),
      ),
    });
  }

  /**
   * Demande d'édition du texte de début ou de fin d'une flèche (double-clic près d'un bout) : comme
   * `editLabel`, avec `end` dans la demande ; l'UI appelle ensuite `setEdgeEndLabel`.
   */
  editEdgeEndLabel(edgeId: string, end: EdgeEnd): void {
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    const current = edge && endLabelOf(edge, end);
    const screen = this.labelEditScreen(edgeId, end, current?.id);
    if (!editable || !edge || !screen) return;
    this.startLabelEdit({
      pageId: editable.page.id,
      elementId: edgeId,
      end,
      labelCellId: current?.id,
      text: current?.label ?? '',
      screen,
      styleCellId: current?.id,
      // Texte à créer : avec la configuration qu'il aura (taille, couleur, alignement).
      style: current?.style ?? { ...edge.style, ...this.endTextStyle(this.endTextLayout(edgeId, end)) },
      html: current?.style.html === '1' ? cellLabelValue(editable.pageTree, current.id) : undefined,
      scale: this.textScale(edgeId),
      onEdge: true,
      ...this.labelEditBackdrop(current?.style ?? edge.style, true),
    });
  }

  /**
   * Fond et halo du texte édité, comme le label dessiné : une forme a le fond de `labelBackgroundColor`
   * (`default` = la page) ; une flèche n'a de fond que s'il est explicite, sinon un halo autour des lettres.
   */
  private labelEditBackdrop(
    style: Record<string, string>,
    onEdge: boolean,
  ): Pick<LabelEditRequest, 'background' | 'halo' | 'haloWidth' | 'haloBlur'> {
    const value = style.labelBackgroundColor?.trim().toLowerCase();
    if (value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return { background: value };
    const page = this.settings.background.color;
    if (onEdge) {
      const backdrop = this.settings.shapes.edgeLabelBackdrop;
      return backdrop === 'halo'
        ? {
            halo: page,
            haloWidth: this.settings.shapes.edgeLabelHaloWidth,
            haloBlur: this.settings.shapes.edgeLabelHaloBlur,
          }
        : backdrop === 'solid'
          ? { background: page }
          : {};
    }
    return value === 'default' ? { background: page } : {};
  }

  /**
   * Édition en place : le label dessiné de la cellule est masqué (l'éditeur de l'UI le remplace, au même
   * endroit et dans le même format) jusqu'à `closeLabelEdit`.
   */
  private startLabelEdit(request: LabelEditRequest): void {
    this.closeLabelEdit();
    this.labelEditing = this.withFlip(request);
    this.hideEditedLabel();
    this.updateSelectionOutline();
    this.events.emit('labelEdit', this.labelEditing);
  }

  /**
   * Emprise à l'écran du texte édité : la zone de texte d'une forme (dessus du volume), le milieu d'une
   * flèche, ou le point de son texte de début / fin.
   */
  private labelEditScreen(elementId: string, end?: EdgeEnd, labelCellId?: string, flipped = false): Rect | undefined {
    const edge = this.getCurrentPage()?.edges.find((e) => e.id === elementId);
    if (!edge) {
      // Forme : sa zone de texte, celle où le label est dessiné à ce niveau de rendu.
      const shape = this.getCurrentPage()?.shapes.find((s) => s.id === elementId);
      const level = this.scenes.current?.level ?? 'flat';
      return shape
        ? this.screenRectOf(elementId, this.registry.textZone(shape, level), this.labelTop(shape))
        : undefined;
    }
    // Flèche : le point où le texte est dessiné (son label, un label enfant, ou un début / fin à créer).
    const route = this.sceneObject(elementId)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    const child = labelCellId ? edge.labels.find((l) => l.id === labelCellId) : undefined;
    const placement =
      child?.placement ??
      (end ? edgeTextLayout(route, end, flipped, this.endTextGap()).placement : edge.labelPlacement);
    const center = this.screenOfPoint(labelPoint(route, placement), this.elementTop(elementId));
    return { x: center.x, y: center.y, width: 0, height: 0 };
  }

  /**
   * Plan du texte d'une forme vue de biais ou tournée : sa zone de texte et ses coins projetés à l'écran,
   * à la hauteur où le label est dessiné. Vue de dessus non tournée : undefined (rectangle `screen`).
   */
  private labelEditPlane(elementId: string): LabelEditPlane | undefined {
    const { tilt, rotation, fov } = this.cameraState;
    if (tilt === 0 && rotation === 0 && fov === undefined) return undefined;
    const shape = this.getCurrentPage()?.shapes.find((s) => s.id === elementId);
    if (!shape) return undefined;
    const { x, y, width, height } = this.registry.textZone(shape, this.scenes.current?.level ?? 'flat');
    const top = this.labelTop(shape);
    const at = (px: number, py: number) => this.screenOfPoint({ x: px, y: py }, top);
    return {
      width,
      height,
      corners: [at(x, y), at(x + width, y), at(x + width, y + height), at(x, y + height)],
    };
  }

  /**
   * La vue a bougé ou changé de taille (panneau latéral, fenêtre) pendant une édition en place :
   * l'éditeur suit l'élément (nouvelle emprise et taille du texte).
   */
  private relocateLabelEdit(): void {
    const editing = this.labelEditing;
    if (!editing || editing.pageId !== this.currentPageId) return;
    const screen = this.labelEditScreen(editing.elementId, editing.end, editing.labelCellId, editing.flipped);
    if (!screen) return;
    const scale = this.textScale(editing.elementId);
    // La bascule disparaît dès que le texte est placé à la main (glisser de sa poignée).
    const plane = editing.onEdge ? undefined : this.labelEditPlane(editing.elementId);
    const next = this.withFlip({ ...editing, screen, scale, plane });
    const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const samePlane = JSON.stringify(plane) === JSON.stringify(editing.plane);
    if (same(screen, editing.screen) && samePlane && scale === editing.scale && next.flip === editing.flip) return;
    this.labelEditing = next;
    this.events.emit('labelEdit', this.labelEditing);
  }

  /** Fin de l'édition en place (validée ou annulée) : le label dessiné réapparaît. */
  closeLabelEdit(): void {
    const editing = this.labelEditing;
    if (!editing) return;
    this.labelEditing = undefined;
    this.labelObjects(editing.styleCellId).forEach((object) => (object.visible = true));
    this.updateSelectionOutline();
  }

  private hideEditedLabel(): void {
    const editing = this.labelEditing;
    if (!editing || editing.pageId !== this.currentPageId) return;
    this.labelObjects(editing.styleCellId).forEach((object) => (object.visible = false));
    this.requestRender();
  }

  /** Objets de label (texte dessiné) d'une cellule dans la scène courante. */
  private labelObjects(cellId: string | undefined): Object3D[] {
    const found: Object3D[] = [];
    if (cellId) {
      this.scenes.current?.root.traverse((object) => {
        if (object.userData.labelCellId === cellId) found.push(object);
      });
    }
    return found;
  }

  /** Pixels écran par pixel de page au niveau d'un élément (taille du texte de l'éditeur en place). */
  private textScale(elementId: string): number {
    if (this.cameraState.mode !== '3d') return this.cameraState.zoom;
    const rect = this.screenRectOf(elementId);
    const top = this.elementTop(elementId);
    const center = rect
      ? screenToPage(this.cameraState, this.viewport, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
      : { x: 0, y: 0 };
    const at = this.screenOfPoint(center, top);
    const dx = this.screenOfPoint({ x: center.x + 10, y: center.y }, top);
    const dy = this.screenOfPoint({ x: center.x, y: center.y + 10 }, top);
    return Math.max(Math.hypot(dx.x - at.x, dx.y - at.y), Math.hypot(dy.x - at.x, dy.y - at.y)) / 10;
  }

  /**
   * Format du texte d'une cellule de la page courante (forme, arête ou label enfant) : clés de style
   * `fontStyle`, `fontSize`, `fontColor`, `align`, `verticalAlign`… (undefined = clé retirée). Une
   * étape d'annulation ; pendant l'édition en place, l'éditeur reçoit le nouveau format.
   */
  setTextFormat(cellId: string, patch: Record<string, string | undefined>): void {
    const editable = this.editablePage();
    if (!editable || !editable.pageTree.cells.get(cellId)?.cell) return;
    const page = editable.page;
    const style =
      [...page.shapes, ...page.edges].find((e) => e.id === cellId)?.style ??
      page.edges.flatMap((e) => e.labels).find((l) => l.id === cellId)?.style;
    if (!style) return;
    const changes = Object.entries(patch).filter(([key, value]) => style[key] !== value);
    if (changes.length === 0) return;
    this.recordEdit('Format du texte');
    for (const [key, value] of changes) setCellStyleValue(editable.pageTree, cellId, key, value);
    this.documentChanged([page.id]);
    const editing = this.labelEditing;
    if (editing?.styleCellId === cellId) {
      const next = { ...style, ...Object.fromEntries(changes) };
      for (const [key, value] of changes) if (value === undefined) delete next[key];
      this.labelEditing = { ...editing, style: next as Record<string, string> };
      this.events.emit('labelEdit', this.labelEditing);
    }
  }

  /** Remplace le label d'un élément (texte brut ; converti en HTML si le style l'exige). */
  /**
   * Remplace le label d'un élément : texte brut (converti en HTML si le style l'exige), ou HTML draw.io
   * si le texte a une mise en forme partielle (`html`, le style passe en `html=1`).
   */
  setLabel(elementId: string, text: string, html?: string): void {
    const editable = this.editablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    if (
      html === undefined
        ? element.label === text && !element.rich
        : cellLabelValue(editable.pageTree, elementId) === html
    )
      return;
    this.recordEdit('Texte');
    if (html === undefined) setCellLabel(editable.pageTree, elementId, text);
    else setCellRichLabel(editable.pageTree, elementId, html);
    this.documentChanged([editable.page.id]);
  }

  /**
   * Texte de début ou de fin d'une flèche de la page courante (label enfant près de la source ou de
   * la cible, comme dans draw.io) : créé, modifié, ou retiré si le texte est vide.
   */
  setEdgeEndLabel(edgeId: string, end: EdgeEnd, text: string, html?: string, flipped = false): void {
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge) return;
    const current = endLabelOf(edge, end);
    const value = text.trim() === '' ? '' : text;
    const rich = value ? html : undefined;
    const unchanged =
      rich === undefined
        ? (current?.label ?? '') === value && !current?.rich
        : current !== undefined && cellLabelValue(editable.pageTree, current.id) === rich;
    if (unchanged) return;
    this.recordEdit(end === 'start' ? 'Texte de début' : 'Texte de fin');
    const write = (id: string) =>
      rich === undefined ? setCellLabel(editable.pageTree, id, value) : setCellRichLabel(editable.pageTree, id, rich);
    if (!value && current) removeCells(editable.pageTree, [current.id]);
    else if (current) write(current.id);
    else {
      // Texte de début / fin créé : configuration par défaut d'après le tracé (contre son bout, côté et
      // alignement qui l'éloignent de la forme), plus petit et grisé (paramètres).
      const layout = this.endTextLayout(edgeId, end, flipped);
      const id = addEdgeLabelCell(editable.pageTree, edgeId, { value: '', position: layout.placement.position });
      setLabelPlacement(editable.pageTree, id, layout.placement);
      for (const [key, value] of Object.entries(this.endTextStyle(layout))) {
        setCellStyleValue(editable.pageTree, id, key, value);
      }
      write(id);
    }
    this.documentChanged([editable.page.id]);
  }

  /** Lien d'un élément de la page courante (vers une page ou une URL) ; undefined = retiré. */
  setLink(elementId: string, link: LinkModel | undefined): void {
    const editable = this.editablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    const href = link ? formatLink(link) : undefined;
    if (href === (element.link ? formatLink(element.link) : undefined)) return;
    this.recordEdit(link ? 'Lien' : 'Lien retiré');
    setCellLink(editable.pageTree, elementId, href);
    this.documentChanged([editable.page.id]);
  }

  /**
   * Attribut spatial d'une forme (SPEC §14.3), ex. `spatial.height`, `spatial.elevation` ; undefined
   * le retire (valeur par défaut). Écrit là où il est déjà (attribut de l'objet), sinon dans le style.
   */
  setSpatial(elementId: string, key: string, value: number | undefined): void {
    const editable = this.editablePage();
    const shape = editable?.page.shapes.find((s) => s.id === elementId);
    if (!editable || !shape || !key.startsWith(SPATIAL_PREFIX)) return;
    const text = value === undefined || !Number.isFinite(value) ? undefined : formatNumber(Math.max(0, value));
    if (spatialValue(shape, key) === text) return;
    this.recordEdit('Attribut spatial');
    const inObject = shape.attributes[key] !== undefined && shape.style[key] === undefined;
    if (!inObject || !setCellObjectAttribute(editable.pageTree, elementId, key, text)) {
      setCellStyleValue(editable.pageTree, elementId, key, text);
    }
    this.documentChanged([editable.page.id]);
  }

  /**
   * Applique un style (fond, contour, texte) à des formes de la page courante, en une seule étape
   * d'annulation. `known` : styles de la palette, pour retirer une couleur de texte posée par l'un d'eux.
   */
  applyStylePreset(elementIds: string[], preset: StylePreset, known: StylePreset[] = []): void {
    const editable = this.editablePage();
    if (!editable || !this.xmlTree) return;
    const shapes = editable.page.shapes.filter((s) => elementIds.includes(s.id));
    const before = writeDrawio(this.xmlTree);
    let changed = false;
    for (const shape of shapes) {
      changed = applyStylePreset(editable.pageTree, shape.id, shape.style, preset, known) || changed;
    }
    if (!changed) return;
    this.undoStack.record(shapes.length > 1 ? 'Style des formes' : 'Style', before);
    this.documentChanged([editable.page.id]);
  }

  /**
   * Clés de style draw.io sur des formes ou des flèches de la page courante (ex. bordure : `strokeColor`, `strokeWidth`,
   * `dashed`…), en une étape d'annulation ; undefined retire la clé. Seules les clés qui changent.
   */
  setElementsStyle(
    elementIds: string[],
    patch: Record<string, string | undefined> | ((style: Record<string, string>) => Record<string, string | undefined>),
    label = 'Style',
  ): void {
    const editable = this.editablePage();
    if (!editable) return;
    // Formes ou flèches (ex. tracé d'une flèche : `rounded`, `curved`).
    const shapes = [...editable.page.shapes, ...editable.page.edges].filter((s) => elementIds.includes(s.id));
    // Patch calculé élément par élément (ex. routeur orthogonal remis aux seules flèches droites).
    const changes = shapes.flatMap((shape) =>
      Object.entries(typeof patch === 'function' ? patch(shape.style) : patch)
        .filter(([key, value]) => shape.style[key] !== value)
        .map(([key, value]) => ({ id: shape.id, key, value })),
    );
    if (changes.length === 0) return;
    this.recordEdit(label);
    for (const { id, key, value } of changes) setCellStyleValue(editable.pageTree, id, key, value);
    this.documentChanged([editable.page.id]);
  }

  /** Supprime la sélection : avec son contenu, ses labels et les arêtes qui y sont reliées (comme draw.io). */
  deleteSelection(label = 'Suppression'): void {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    this.recordEdit(label);
    removeCellsDeep(
      editable.pageTree,
      selection.items.map((item) => item.element.id),
    );
    this.clearSelection();
    this.documentChanged([editable.page.id]);
  }

  /**
   * Copie la sélection (ticket 59) : renvoie le XML à mettre dans le presse-papier (format draw.io),
   * aussi gardé comme presse-papier interne. Undefined : rien à copier.
   */
  copySelection(): string | undefined {
    const xml = this.selectionClipboard();
    if (!xml || !this.selection) return undefined;
    const parents = new Map<string, string>();
    for (const { element } of this.selection.items) if (element.parentId) parents.set(element.id, element.parentId);
    this.clipboard = { xml, fileId: this.fileId, pageId: this.selection.pageId, parents, steps: 1 };
    return xml;
  }

  /** Coupe la sélection : copiée puis supprimée ; le premier collage la remet à sa place. */
  cutSelection(): string | undefined {
    if (!this.editablePage()) return undefined;
    const xml = this.copySelection();
    if (!xml || !this.clipboard) return undefined;
    this.clipboard.steps = 0;
    this.deleteSelection('Couper');
    return xml;
  }

  /**
   * Colle sur la page courante : `text` lu dans le presse-papier système (sans lui : le presse-papier
   * interne). Les éléments collés sont décalés d'un pas de grille de plus à chaque collage du même
   * contenu, puis sélectionnés. Renvoie false si le texte n'est pas un contenu draw.io.
   */
  paste(text?: string): boolean {
    const editable = this.editablePage();
    if (!editable) return false;
    if (text !== undefined && text.trim() !== this.clipboard?.xml.trim()) {
      if (!readClipboardModel(text)) return false;
      this.clipboard = { xml: text, pageId: '', parents: new Map(), steps: 1 };
    }
    const clipboard = this.clipboard;
    if (!clipboard) return false;
    const step = this.gridStep(editable.pageTree);
    const delta = { x: clipboard.steps * step, y: clipboard.steps * step };
    const samePage = clipboard.fileId === this.fileId && clipboard.pageId === editable.page.id;
    if (!this.pasteXml(clipboard.xml, delta, 'Coller', samePage ? clipboard.parents : undefined)) return false;
    clipboard.steps++;
    return true;
  }

  /** Duplique la sélection (copier + coller sans toucher au presse-papier), décalée d'un pas de grille. */
  duplicateSelection(): void {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || !selection) return;
    const xml = this.selectionClipboard();
    if (!xml) return;
    const parents = new Map<string, string>();
    for (const { element } of selection.items) if (element.parentId) parents.set(element.id, element.parentId);
    const step = this.gridStep(editable.pageTree);
    this.pasteXml(xml, { x: step, y: step }, 'Dupliquer', parents);
  }

  /** XML du presse-papier pour la sélection de la page courante. */
  private selectionClipboard(): string | undefined {
    const page = this.getCurrentPage();
    const selection = this.selection;
    if (!page || !selection || selection.pageId !== page.id) return undefined;
    const pageTree = this.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return copyCells(
      pageTree,
      selection.items.map((item) => item.element.id),
      {
        origin: (id) => page.shapes.find((s) => s.id === id)?.bounds,
        edgeEnd: (id, end) => {
          const route = this.sceneObject(id)?.userData.route as Point[] | undefined;
          return end === 'source' ? route?.[0] : route?.at(-1);
        },
      },
    );
  }

  /** Pas de décalage d'un collage : la grille de la page (10 si elle est désactivée). */
  private gridStep(pageTree: PageTree): number {
    return gridSizeOf(pageTree) || 10;
  }

  /** Colle un contenu du presse-papier sur la page courante (une étape d'annulation) et le sélectionne. */
  private pasteXml(xml: string, delta: Point, label: string, parents?: Map<string, string>): boolean {
    const editable = this.editablePage();
    const model = readClipboardModel(xml);
    if (!editable || !model) return false;
    this.endMove();
    const { page, pageTree } = editable;
    this.recordEdit(label);
    const ids = pasteCells(pageTree, model, {
      delta,
      parentOf: (id) => {
        const parentId = parents?.get(id);
        const parent = parentId ? page.shapes.find((s) => s.id === parentId) : undefined;
        return parent && pageTree.cells.has(parent.id) ? { id: parent.id, origin: parent.bounds } : undefined;
      },
    });
    this.documentChanged([page.id]);
    const current = this.getCurrentPage();
    const items = ids.flatMap((id): PickedElement[] => {
      const shape = current?.shapes.find((s) => s.id === id);
      if (shape) return [{ type: 'shape', element: shape }];
      const edge = current?.edges.find((e) => e.id === id);
      return edge ? [{ type: 'edge', element: edge }] : [];
    });
    this.selectItems(items);
    return true;
  }

  canUndo(): boolean {
    return this.editable && this.undoStack.undoLabel() !== undefined;
  }

  canRedo(): boolean {
    return this.editable && this.undoStack.redoLabel() !== undefined;
  }

  undo(): void {
    if (!this.editable || !this.xmlTree || this.transition) return;
    this.endMove();
    const previous = this.undoStack.undo(writeDrawio(this.xmlTree));
    if (previous !== undefined) this.restore(previous);
  }

  redo(): void {
    if (!this.editable || !this.xmlTree || this.transition) return;
    this.endMove();
    const next = this.undoStack.redo(writeDrawio(this.xmlTree));
    if (next !== undefined) this.restore(next);
  }

  /** État avant une modification, pour pouvoir l'annuler. */
  private recordEdit(label: string): void {
    if (this.xmlTree) this.undoStack.record(label, writeDrawio(this.xmlTree));
  }

  /** Revient à un instantané : document relu, scènes reconstruites, même page si elle existe encore. */
  private restore(xml: string): void {
    const { document, tree } = readDrawio(xml);
    this.document = document;
    this.xmlTree = tree;
    this.unsupportedReport = collectUnsupported(document, this.registry);
    this.clearSelection();
    this.graph = undefined;
    this.scenes.clear();
    const current = this.currentPageId;
    const pageId =
      current && (current === GRAPH_PAGE_ID || document.pages.some((p) => p.id === current))
        ? current
        : document.pages[0]?.id;
    this.currentPageId = undefined;
    this.syncModified();
    this.events.emit('documentChange', document);
    if (pageId) this.goToPage(pageId);
  }

  /** État « modifié » et libellés annuler / rétablir, d'après la pile d'annulation. */
  private syncModified(): void {
    this.setModified(this.undoStack.isModified());
    this.events.emit('undoChange', this.undoStack.undoLabel(), this.undoStack.redoLabel());
  }

  /**
   * Emprise à l'écran d'un élément de la page courante (formes : dessus du volume) ; `area` : une
   * partie de la forme en coordonnées page (sa zone de texte), à la place de ses bornes ; `elevation` :
   * hauteur de cette partie, à la place du dessus du volume.
   */
  private screenRectOf(elementId: string, area?: Rect, elevation?: number): Rect | undefined {
    const page = this.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === elementId);
    let corners: Point[];
    if (shape) {
      const { x, y, width, height } = area ?? shape.bounds;
      const top = elevation ?? this.elementTop(shape.id);
      corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ].map((p) => this.screenOfPoint(p, top));
    } else {
      const route = this.sceneObject(elementId)?.userData.route as Point[] | undefined;
      if (!route?.length) return undefined;
      const middle = route[Math.floor(route.length / 2)]!;
      const center = this.screenOfPoint(middle, this.elementTop(elementId));
      return { x: center.x - 60, y: center.y - 16, width: 120, height: 32 };
    }
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }

  /**
   * Clic : sélectionne l'élément ; avec la touche de sélection multiple, l'ajoute ou le retire (le vide
   * ne désélectionne pas). `followLink` (touche + clic, `controls.followLinkGesture`) : suit le lien de
   * l'élément, s'il en a un.
   */
  private handleClick(screen: Point, toggle = false, followLink = false): void {
    const picked = this.pickAt(screen);
    if (followLink && picked && isNavigableLink(picked.element.link)) {
      this.followLink(picked.element.id);
      return;
    }
    if (toggle) {
      if (picked) this.toggleSelect(picked);
      return;
    }
    this.select(picked);
    if (this.settings.preload.onClick) this.preloadLink(picked?.element.link);
  }

  /**
   * Double-clic : avec la touche pour suivre un lien (quand le geste choisi est le double-clic), ou sur
   * une carte de la vue graphe, suit le lien ; sinon, édite le label de l'élément (page modifiable).
   * Sur une flèche, près d'un bout, édite son texte de début ou de fin.
   */
  private handleDoubleClick(screen: Point, followLink: boolean): void {
    if (this.doubleClickPointHandle(screen)) return;
    const picked = this.pickAt(screen);
    const text = picked?.type === 'edge' ? this.edgeTextAt(screen) : undefined;
    const follow = followLink || this.isGraphView();
    if (picked && follow && isNavigableLink(picked.element.link)) this.followLink(picked.element.id);
    else if (text) this.editEdgeText(text.edge.id, text.cellId);
    else if (picked?.type === 'edge') {
      // Près d'un bout : texte de début ou de fin ; vers le milieu : label de la flèche.
      const route = this.sceneObject(picked.element.id)?.userData.route as Point[] | undefined;
      const point = this.groundPointAtHeight(screen, this.elementTop(picked.element.id));
      const end = route ? endAt(positionAlong(route, point)) : undefined;
      if (end) this.editEdgeEndLabel(picked.element.id, end);
      else this.editLabel(picked.element.id);
    } else if (picked) this.editLabel(picked.element.id);
  }

  /**
   * Double-clic sur une poignée de la flèche sélectionnée, comme draw.io : un point intermédiaire est
   * retiré ; le coude d'une flèche en coude bascule entre horizontal et vertical.
   */
  private doubleClickPointHandle(screen: Point): boolean {
    const handle = this.pointHandleAt(screen);
    const editable = handle && this.editableEdgeSelection();
    if (!handle || !editable) return false;
    const { page, pageTree, edge } = editable;
    if (handle.kind === 'point') {
      this.recordEdit('Point retiré');
      this.writeEdgePoints(page, pageTree, edge, removePoint(edge.points, handle.index));
      this.documentChanged([page.id]);
      return true;
    }
    if (handle.kind === 'elbow') {
      this.recordEdit('Coude basculé');
      setCellStyleValue(pageTree, edge.id, 'elbow', edge.style.elbow === 'vertical' ? 'horizontal' : 'vertical');
      this.documentChanged([page.id]);
      return true;
    }
    return false;
  }

  /** Survol : curseur main et infobulle sur les éléments liés ; préchargement optionnel. */
  private handleHover(screen: Point | undefined): void {
    const picked = screen ? this.pickAt(screen) : undefined;
    const link = isNavigableLink(picked?.element.link) ? picked?.element.link : undefined;
    const handle = screen ? this.handleAt(screen) : undefined;
    const edgeEnd = screen && !handle ? this.edgeEndAt(screen) : undefined;
    const pointHandle = screen && !handle && !edgeEnd ? this.pointHandleAt(screen) : undefined;
    const bent = pointHandle && this.editableEdgeSelection()?.edge;
    const cursor =
      handle === 'connect' || edgeEnd
        ? 'crosshair'
        : handle
          ? HANDLE_CURSORS[handle]
          : pointHandle && bent
            ? this.pointHandleCursor(pointHandle, bent.style)
            : link
              ? 'pointer'
              : '';
    if (!this.canvas.style.cursor.startsWith('grab')) this.canvas.style.cursor = cursor;
    this.canvas.title = link ? this.describeLink(link) : '';
    clearTimeout(this.hoverTimer);
    if (link && this.settings.preload.onHover) {
      this.hoverTimer = setTimeout(() => this.preloadLink(link), this.settings.preload.hoverDelayMs);
    }
  }

  private describeLink(link: LinkModel): string {
    const { followLinkKey: key, followLinkGesture: chosen } = this.settings.controls;
    const click = followLinkGesture(key, chosen) === 'click' ? 'clic' : 'double-clic';
    const gesture = key === 'none' ? click : `${MODIFIER_KEY_LABELS[key]} + ${click}`;
    if (link.type === 'url') return `${link.href} (${gesture} : ouvrir dans un nouvel onglet)`;
    const name = this.pageById(link.pageId)?.name;
    const action = `${gesture} : aller à « ${name} »`;
    return name ? action.charAt(0).toUpperCase() + action.slice(1) : `Lien vers une page absente (${link.pageId})`;
  }

  /** Hauteur du dessus d'un élément (volume iso), mise à l'échelle de la bascule ; 0 à plat. */
  /**
   * Hauteur où le label d'une forme est dessiné : le dessus de son volume, ou sa base pour un label hors
   * de la forme (posé au sol à côté du volume, `createShapeObject`).
   */
  private labelTop(shape: ShapeModel): number {
    if (!outsideLabelBox(shape.bounds, shape.style)) return this.elementTop(shape.id);
    const base = (this.sceneObject(shape.id)?.userData.base as number | undefined) ?? 0;
    return this.scenes.current?.level === 'iso' ? base * this.heightScale : 0;
  }

  private elementTop(elementId: string): number {
    const top = (this.sceneObject(elementId)?.userData.top as number | undefined) ?? 0;
    return this.scenes.current?.level === 'iso' ? top * this.heightScale : 0;
  }

  /** Point de la page visé par un point écran, sur le plan horizontal à `height` au-dessus du sol. */
  private groundPointAtHeight(screen: Point, height: number): Point {
    return screenToPage(this.cameraState, this.viewport, screen, height);
  }

  private sceneObject(elementId: string) {
    return this.scenes.current?.root.children.find((c) => c.userData.elementId === elementId);
  }

  /**
   * Contour de sélection animé (paramètre `selection`) : les tirets défilent lentement tant qu'il y a
   * une sélection ; arrêté sans sélection, si désactivé, ou si les animations sont réduites.
   */
  private syncSelectionAnimation(): void {
    const run =
      this.selection !== undefined &&
      this.settings.selection.style === 'outline' &&
      this.settings.selection.animated &&
      !this.reducedMotion();
    if (!run) {
      cancelAnimationFrame(this.selectionAnimation);
      this.selectionAnimation = 0;
      if (this.selectionPhase !== 0) {
        this.selectionPhase = 0;
        this.updateSelectionOutline();
      }
      return;
    }
    if (this.selectionAnimation) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Phase décroissante : les tirets avancent dans le sens du contour.
      this.selectionPhase -= this.settings.selection.speed * dt;
      this.updateSelectionOutline();
      this.selectionAnimation = requestAnimationFrame(tick);
    };
    this.selectionAnimation = requestAnimationFrame(tick);
  }

  /**
   * Touches de modification maintenues : zones liées en évidence (touche pour suivre un lien), et
   * mode d'interaction signalé à l'UI (`modeHint`).
   */
  private setHeldKeys(held: HeldKeys): void {
    this.heldKeys = held;
    if (this.linkZonesShown !== held.followLink) {
      this.linkZonesShown = held.followLink;
      this.updateLinkZones();
    }
    this.emitModeHint();
  }

  /**
   * Mode d'interaction en cours, pour l'aide de l'UI : « navigation » tant que la touche pour suivre
   * un lien est maintenue ; « sélection multiple » quand la touche de sélection multiple l'est, avec
   * une sélection.
   */
  getModeHint(): ModeHint | undefined {
    if (this.heldKeys.followLink) return 'navigation';
    if (this.heldKeys.multiSelect && this.selection) return 'multiSelect';
    return undefined;
  }

  private emitModeHint(): void {
    const hint = this.getModeHint();
    if (hint === this.modeHint) return;
    this.modeHint = hint;
    this.events.emit('modeHint', hint);
  }

  /**
   * Zones liées (SPEC §11.1) : chaque forme ou flèche de la page courante qui porte un lien navigable,
   * encadrée tant que la touche pour suivre un lien est maintenue (pas pendant une transition).
   */
  private updateLinkZones(): void {
    if (this.linkZonesObject) {
      this.linkZonesObject.removeFromParent();
      disposeObject(this.linkZonesObject);
      this.linkZonesObject = undefined;
    }
    const root = this.scenes.current?.root;
    const page = this.getCurrentPage();
    if (this.linkZonesShown && root && page && !this.transition) {
      const zones = new Group();
      zones.name = 'link-zones';
      for (const element of [...page.shapes, ...page.edges]) {
        const link = element.link;
        // Un lien vers une page absente ne mène nulle part : pas de zone.
        if (!isNavigableLink(link) || (link.type === 'page' && !this.pageById(link.pageId))) continue;
        const bounds = 'bounds' in element ? element.bounds : this.drawnBounds(element.id);
        if (!bounds) continue;
        const zone = linkZone(bounds, this.cameraState.zoom, this.settings.selection.accentColor);
        // Posée sur le dessus d'un volume, et toujours visible (pas cachée par les blocs).
        zone.position.z = ((this.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
        zone.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
        });
        zones.add(zone);
      }
      root.add(zones);
      this.linkZonesObject = zones;
    }
    this.requestRender();
  }

  /**
   * Mise en valeur de la sélection (paramètre `selection.style`) : voile d'ombre sur le reste de la
   * page (défaut), ou contour bleu pointillé (éventuellement animé).
   */
  private updateSelectionOutline(): void {
    if (this.selectionObject) {
      this.selectionObject.parent?.remove(this.selectionObject);
      disposeObject(this.selectionObject);
      this.selectionObject = undefined;
    }
    const selection = this.selection;
    const root = this.scenes.current?.root;
    const visible = selection && root && selection.pageId === this.currentPageId ? selection : undefined;
    const items = visible?.items ?? [];
    const ids = items.map((item) => item.element.id);

    // Voile : gardé tant que la même sélection est affichée dans la même scène.
    // L'emprise de la page en fait partie : le voile la couvre, et un déplacement peut l'agrandir.
    const pageBounds = this.getCurrentPage()?.bounds;
    const veilKey =
      visible && root && pageBounds && this.settings.selection.style === 'veil'
        ? `${root.uuid}:${ids.join('|')}:${this.settings.selection.veilOpacity}:${this.settings.selection.veilColor}:${Object.values(pageBounds).join(',')}`
        : undefined;
    if (this.veil?.key !== veilKey) {
      this.clearVeil();
      const page = this.getCurrentPage();
      if (veilKey && root && page) {
        const object = createVeil(page.bounds, this.settings.selection.veilOpacity, this.settings.selection.veilColor);
        root.add(object);
        // Une forme sélectionnée est mise en valeur avec son contenu (enfants d'un groupe, d'un conteneur).
        const highlighted = new Set(ids);
        for (const item of items) {
          if (item.type !== 'shape') continue;
          const content = collectMoveSet(page, item.element.id);
          for (const id of [...content.shapeIds, ...content.edgeIds]) highlighted.add(id);
        }
        const lifted = root.children.filter((c) => {
          const elementId = c.userData.elementId as string | undefined;
          const partner = c.userData.highlightWith as string | undefined;
          return (
            (elementId !== undefined && highlighted.has(elementId)) ||
            (partner !== undefined && highlighted.has(partner))
          );
        });
        this.veil = { key: veilKey, object, restore: liftAboveVeil(lifted) };
      }
    }

    // Flèches et liaisons : le voile est percé autour de leur tracé (≈ 10 px de chaque côté à l'écran).
    const edges = veilKey ? items.filter((item) => item.type === 'edge') : [];
    const holeKey =
      edges.length > 0 ? `${veilKey}:${this.cameraState.zoom}:${this.settings.selection.veilPadding}` : undefined;
    if (this.veilHole?.key !== holeKey) {
      this.veilHole?.object.removeFromParent();
      if (this.veilHole) disposeObject(this.veilHole.object);
      this.veilHole = undefined;
      if (holeKey && root) {
        const holes = new Group();
        holes.name = 'selection-veil-holes';
        for (const { element } of edges) {
          const object = this.sceneObject(element.id);
          const route = (object?.userData.path ?? object?.userData.route) as Point[] | undefined;
          if (!object || !route || route.length < 2) continue;
          const strokeWidth = parseFloat((element.style.strokeWidth as string | undefined) ?? '1') || 1;
          const width = strokeWidth + (2 * this.settings.selection.veilPadding) / this.cameraState.zoom;
          holes.add(createVeilHole(route, object.position.z, width));
        }
        root.add(holes);
        this.veilHole = { key: holeKey, object: holes };
      }
    }

    if (root && items.length > 0 && this.settings.selection.style === 'outline') {
      const outlines = new Group();
      outlines.name = 'selection';
      for (const { type, element } of items) {
        const bounds = type === 'shape' ? element.bounds : this.drawnBounds(element.id);
        if (!bounds) continue;
        const outline = selectionOutline(
          bounds,
          this.cameraState.zoom,
          this.selectionPhase,
          this.settings.selection.accentColor,
        );
        // Posé sur le dessus d'un volume, et toujours visible (pas caché par les blocs).
        outline.position.z = ((this.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
        outline.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
        });
        outlines.add(outline);
      }
      outlines.renderOrder = Number.MAX_SAFE_INTEGER;
      this.selectionObject = outlines;
      root.add(outlines);
    }

    // Poignées (redimensionner, connecter) de la forme sélectionnée, si on peut la modifier.
    if (this.handlesObject) {
      this.handlesObject.removeFromParent();
      disposeObject(this.handlesObject);
      this.handlesObject = undefined;
    }
    const editableEdge = visible && root ? this.edgeHandlesSelection() : undefined;
    const ends = editableEdge && this.edgeEndPoints(editableEdge.edge.id);
    if (editableEdge && ends && root) {
      const { edge } = editableEdge;
      const handleStyle = { size: this.settings.edit.handleSize, accent: this.settings.selection.accentColor };
      this.handlesObject = edgeEndHandles(
        [
          { point: ends.source, attached: !!edge.sourceId },
          { point: ends.target, attached: !!edge.targetId },
        ],
        this.cameraState.zoom,
        handleStyle,
      );
      const context = this.pointsContext(editableEdge.page, edge);
      if (context) this.handlesObject.add(edgePointHandles(pointHandles(context), this.cameraState.zoom, handleStyle));
      this.handlesObject.position.z = this.elementTop(edge.id) + 0.3;
      this.handlesObject.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
      });
      root.add(this.handlesObject);
    }
    const editable = visible && root ? this.editableSelection() : undefined;
    if (editable && root) {
      const { shape } = editable;
      this.handlesObject = selectionHandles(shape.bounds, this.cameraState.zoom, {
        resize: shape.kind !== 'group',
        connect: true,
        size: this.settings.edit.handleSize,
        accent: this.settings.selection.accentColor,
      });
      this.handlesObject.position.z = this.elementTop(shape.id) + 0.3;
      this.handlesObject.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
      });
      root.add(this.handlesObject);
    }
    this.requestRender();
  }

  private clearVeil(): void {
    this.veilHole?.object.removeFromParent();
    if (this.veilHole) disposeObject(this.veilHole.object);
    this.veilHole = undefined;
    if (!this.veil) return;
    this.veil.restore();
    this.veil.object.removeFromParent();
    disposeObject(this.veil.object);
    this.veil = undefined;
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.animation);
    cancelAnimationFrame(this.selectionAnimation);
    clearTimeout(this.hoverTimer);
    this.transition?.abort();
    this.resizeObserver.disconnect();
    this.controller.dispose();
    this.reducedMotionQuery?.removeEventListener?.('change', this.onReducedMotionChange);
    this.minimap?.dispose();
    this.scenes.clear();
    this.grid.dispose();
    this.text.dispose();
    // Pas de forceContextLoss : le même canvas peut être repris par un nouveau moteur
    // (double montage de React en dev). Le contexte est libéré avec le canvas.
    this.renderer.dispose();
    this.events.clear();
  }

  // -------------------------------------------------------------------------

  private resize(): void {
    // Taille exacte (clientWidth/clientHeight arrondissent, ce qui décale le zoom au curseur).
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    if (width === this.viewport.width && height === this.viewport.height) return;
    this.viewport = { width, height };
    this.renderer.setSize(width, height, false);
    setLineResolution(width, height);
    if (this.pendingFit && this.isMeasured()) {
      this.setCameraState(fitBounds(this.pendingFit, this.viewport, this.orientation()));
      return;
    }
    this.applyProjection();
    this.relocateLabelEdit();
    this.minimap?.requestDraw();
    this.requestRender();
  }

  /**
   * Fondu enchaîné 2D ↔ volume en deux passes : la page à plat (avec le fond), puis les volumes
   * par-dessus, profondeur remise à zéro. Les blocs s'occultent entre eux, mais des blocs presque
   * aplatis ne masquent pas les traits et labels de la page à plat.
   */
  private renderBlend(flat: PageScene, volume: PageScene): void {
    const camera = this.activeCamera();
    const background = this.scene.background;
    const gridVisible = this.grid.mesh.visible;
    volume.root.visible = false;
    flat.root.visible = true;
    this.renderer.render(this.scene, camera);
    flat.root.visible = false;
    volume.root.visible = true;
    this.grid.mesh.visible = false;
    this.scene.background = null;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.scene, camera);
    this.renderer.autoClear = true;
    this.scene.background = background;
    this.grid.mesh.visible = gridVisible;
    flat.root.visible = true;
  }

  /** Caméra du rendu : en perspective quand l'état a un champ de vision (3D, bascules). */
  private activeCamera(): OrthographicCamera | PerspectiveCamera {
    return this.cameraState.fov === undefined ? this.camera : this.perspectiveCamera;
  }

  private applyProjection(): void {
    if (this.cameraState.fov === undefined) applyCameraState(this.camera, this.cameraState, this.viewport);
    else applyPerspectiveState(this.perspectiveCamera, this.cameraState, this.viewport);
    // Le plan du fond couvre tout ce que la caméra peut voir.
    this.grid.follow(this.cameraState.center, 2 * this.activeCamera().far);
  }

  /** Un canvas masqué ou pas encore mis en page mesure 0 (ramené à 1). */
  private isMeasured(): boolean {
    return this.viewport.width > 1 && this.viewport.height > 1;
  }

  /** Rendu à la demande : une image par frame au plus, seulement quand quelque chose a changé. */
  private readonly requestRender = (): void => {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const blend = this.levelBlend;
      if (blend?.flat && blend.volume) this.renderBlend(blend.flat, blend.volume);
      else this.renderer.render(this.scene, this.activeCamera());
    });
  };
}

/**
 * Boîte d'un texte dessiné (texte SDF mis en page, ou segments d'un texte riche), en coordonnées de
 * page ; undefined tant que la mise en page n'est pas prête.
 */
function drawnTextBox(object: Object3D, toPage: Matrix4): Box3 | undefined {
  const box = new Box3();
  object.traverse((child) => {
    const info = (child as Object3D & { textRenderInfo?: { blockBounds: [number, number, number, number] } })
      .textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    for (const [x, y] of [
      [minX, minY],
      [maxX, minY],
      [minX, maxY],
      [maxX, maxY],
    ] as const) {
      box.expandByPoint(new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage));
    }
  });
  return box.isEmpty() ? undefined : box;
}

/** Style draw.io avec une clé ajoutée à la fin si elle n'y est pas déjà (`clé=valeur;`). */
function withStyleValue(style: string, key: string, value: string): string {
  if (style.split(';').some((token) => token.split('=')[0]!.trim() === key && token.includes('='))) return style;
  const base = style.trim() === '' || style.trimEnd().endsWith(';') ? style : `${style};`;
  return `${base}${key}=${value};`;
}
