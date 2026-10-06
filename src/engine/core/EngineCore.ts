import { Box3, Group, Matrix4, Mesh, Vector3 } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { Emitter } from '../events';
import { formatLink, isNavigableLink } from '../format/link';
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
  reverseEdgeCell,
  setCellStyleValue,
  setPageAttribute,
  moveEdgeCell,
  setEdgePoints,
  setEdgeTerminal,
} from '../format/edit';
import {
  addEdgeCell,
  addEdgeLabelCell,
  addShapeCell,
  removeCells,
  removeCellsDeep,
  setCellLink,
} from '../format/create';
import { copyCells, pasteCells, readClipboardModel, stripCellKeys } from '../format/clipboard';
import { documentFromTree } from '../format/parse';
import { writeDrawio } from '../format/write';
import type { PageTree } from '../format/xmlTree';
import {
  applyEndAttachment,
  connectableShapes,
  constraintStyle,
  endAttachmentOf,
  restoreEnds,
  sameAttachment,
  frameConstraint,
  shapeAnchors,
  sideOfConstraint,
  snapshotEnds,
  writeEndAttachment,
} from '../edit/edgeEnds';
import type { Anchor, EdgeEndsSnapshot, EndAttachment, TerminalEnd } from '../edit/edgeEnds';
import { dragPoints, pointHandles, pointsEditor, removePoint } from '../edit/edgePoints';
import type { PointHandle, PointsContext } from '../edit/edgePoints';
import { squareEnd } from '../edit/squareEnd';
import { collectMoveSet, isLocked, moveTarget, snapDelta, translateMoveSet, unionMoveSets } from '../edit/move';
import type { MoveSet } from '../edit/move';
import { alignDeltas, distributeDeltas } from '../edit/align';
import type { AlignItem, AlignMove, AlignReference, DistributeMove } from '../edit/align';
import {
  anchorOf,
  edgeTextLayout,
  edgeTexts,
  endAt,
  endLabelOf,
  flipTarget,
  setEdgeTextPlacement,
} from '../edit/edgeLabels';
import type { EdgeTextLayout, EndTextGap, EdgeEnd } from '../edit/edgeLabels';
import { labelPoint, length as polylineLength, placementAt, positionAlong } from '../render/edges/polyline';
import { CONNECT_DIRECTIONS, connectSideOf, handlePoints, isConnectHandle, resizeBounds } from '../edit/handles';
import type { ConnectSide, HandleKind, HandleLayout, ResizeHandle } from '../edit/handles';
import { arrangeAnchors, arrangementChanges, arrangementConflicts } from '../edit/arrange';
import type { Arrangement } from '../edit/arrange';
import type { AvoidOptions } from '../edit/avoid';
import { nextPlacementVariant } from '../edit/variants';
import { affectedShapes, anchorSeedOf, pageGeometry, sideMiddle, withNeighbours } from '../edit/distribute';
import type { Anchoring } from '../edit/distribute';
import { loopWaypoints } from '../edit/loops';
import { dropBounds } from '../edit/palette';
import { applyStylePreset } from '../edit/styles';
import type { StylePreset } from '../edit/styles';
import type { ShapeTemplate } from '../edit/palette';
import { fitBounds, interpolateCamera, pageToScreen, screenToPage, withViewMode } from '../interaction/camera';
import type { CameraState } from '../interaction/camera';
import { CameraController } from '../interaction/controls';
import type { HeldKeys } from '../interaction/controls';
import { NavigationHistory, findParents, usageKey } from '../interaction/history';
import type { HistoryEntry, LinkUsage } from '../interaction/history';
import { GRAPH_PAGE_ID } from '../graph/graphPage';
import { distanceToPolyline, insidePolygon, pickElement } from '../interaction/pick';
import type { PickedElement } from '../interaction/pick';
import { marqueeTakes } from '../interaction/marquee';
import type { Footprint } from '../interaction/marquee';
import { FOLLOW_LINK_KEY_LABELS, followLinkGesture, independentRoots, toggleSelected } from '../interaction/selection';
import { easing, embedIn, embeddedCamera, phase } from '../interaction/transitions';
import { computeBounds } from '../model/bounds';
import type {
  DocumentModel,
  EdgeLabelPlacement,
  EdgeModel,
  LinkModel,
  PageModel,
  Point,
  Rect,
  ShapeModel,
} from '../model/types';
import { linkZone, selectionOutline } from '../render/decorations';
import { middleTextAlong, toTerminal } from '../render/edges/edge';
import { fixedAnchor, perimeterKind, routeEdgePoints, routingCenter } from '../render/edges/route';
import { parseStyle } from '../format/style';
import {
  connectionHints,
  connectorPreview,
  edgeEndHandles,
  edgePointHandles,
  selectionHandles,
} from '../render/handles';
import { createVeil, createVeilHole, liftAboveVeil } from '../render/highlight';
import { disposeObject } from '../render/meshes';
import { setElementsDim, setPageOpacity } from '../render/pageEffects';
import { createEdgeObject, createShapeObject, edgeRoute, placeInDrawOrder } from '../render/pageScene';
import { jumpStyleOf, jumpValue } from '../render/edges/jumps';
import type { JumpDefaults } from '../render/edges/jumps';
import { reorderCells } from '../format/order';
import type { OrderMove } from '../format/order';
import { applyModeEdit } from '../modes/edit';
import { defaultEffectRegistry, pageEffectIds, withPageEffect } from '../effects/registry';
import type { PageEffectRegistry } from '../effects/registry';
import { defaultModeRegistry } from '../modes/registry';
import type { ModeScope, PageModeRegistry } from '../modes/registry';
import type { ModeEdit, ModeTarget } from '../modes/types';
import { SceneManager } from '../render/sceneManager';
import { insetRect, labelMargins } from '../render/labelPosition';
import { defaultShapeRegistry } from '../shapes/registry';
import type { ShapeRegistry } from '../shapes/registry';
import type { SceneLevel } from '../shapes/types';
import { setPageTransform } from '../render/space';
import { createTroikaTextFactory } from '../render/troikaText';
import { modePalette } from '../settings';
import { SPATIAL, SPATIAL_PREFIX, spatialValue } from '../spatial';
import { alongAnchor } from '../render/textPath';
import type { TextAlong } from '../render/textPath';
import type {
  BackTarget,
  EdgeTextAnchor,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  LabelEditPlane,
  LabelEditRequest,
  ModeHint,
  ModeIndicator,
  Selection,
} from './types';
import { Config } from './runtime/config';
import type { Settings } from '../settings';
import { Rendering } from './runtime/rendering';
import { Display } from './runtime/display';
import { DocumentFile } from './document/file';
import { EditHistory } from './document/undo';
import { Pages } from './document/pages';
import { ViewCamera } from './view/camera';
import { ViewModes } from './view/viewModes';
import { Levels } from './view/levels';
import { SceneView } from './view/scene';
import { GraphView } from './view/graph';
import { MinimapView } from './view/minimap';

/** Ouvre une URL externe (SPEC §11.4) : nouvel onglet, sans accès retour à cette page. */
function defaultOpenUrl(href: string): void {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/** Étape d'annulation de chaque changement d'ordre de dessin (ticket 130). */
const ORDER_LABELS: Record<OrderMove, string> = {
  front: 'Premier plan',
  back: 'Arrière-plan',
  forward: 'Avancer',
  backward: 'Reculer',
};

/** Éléments pris sans leur conteneur (un élément pris avec lui n'est pas sélectionné à part), par ordre de z. */
function takenRoots(page: PageModel, taken: PickedElement[]): PickedElement[] {
  const ids = new Set(taken.map((item) => item.element.id));
  const parentOf = new Map(page.shapes.map((s) => [s.id, s.parentId]));
  const hasTakenAncestor = (id: string | undefined): boolean =>
    id !== undefined && (ids.has(id) || hasTakenAncestor(parentOf.get(id)));
  return taken.filter((item) => !hasTakenAncestor(item.element.parentId)).sort((a, b) => a.element.z - b.element.z);
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

/** Point d'ancrage compté comme pris en plus des flèches existantes (ex. départ d'une boucle en cours). */
type TakenAnchor = { shapeId: string; constraint: Point };

/** Bout de flèche en cours de déplacement : il ne prend pas de point d'ancrage. */
type AnchorSkip = {
  edgeId: string;
  end: 'source' | 'target';
  /** Où ce bout était attaché au début du glisser : ce point reste pris. */
  origin?: { shapeId: string; constraint: Point };
};

interface ConnectDrag {
  kind: 'connect';
  pageId: string;
  sourceId: string;
  /** Côté de la forme d'où part la flèche (poignée tirée). */
  side: ConnectSide;
  /** Point de départ retenu : point libre de ce côté le plus proche de la cible visée. */
  exit?: Point;
  /** Coudes d'une boucle sur la forme de départ, écrits en points intermédiaires. */
  loop?: Point[];
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
  /** Point d'ancrage occupé par ce bout au début du glisser (reste pris pendant le glisser). */
  origin?: { shapeId: string; constraint: Point };
  /** Points intermédiaires d'origine (remplacés par les coudes si le bout referme une boucle). */
  originalPoints: Point[];
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

/** Style des connecteurs créés (celui de draw.io par défaut) ; le tracé vient du paramètre `shapes.edgeLineStyle`. */
const CONNECTOR_STYLE = 'orthogonalLoop=1;jettySize=auto;html=1;';
/** Clés du tracé d'une flèche : droite (sans routeur), angles droits, coudes arrondis, courbe (orthogonaux). */
const EDGE_LINE_KEYS = {
  straight: 'rounded=0;',
  sharp: 'edgeStyle=orthogonalEdgeStyle;rounded=0;',
  rounded: 'edgeStyle=orthogonalEdgeStyle;rounded=1;',
  curved: 'edgeStyle=orthogonalEdgeStyle;rounded=0;curved=1;',
} as const;

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

/** Cœur du moteur : état et comportement, derrière la façade `Engine` (SPEC §4.3). */
export class EngineCore {
  // Domaines
  readonly minimap = new MinimapView(this);
  readonly graph = new GraphView(this);
  readonly sceneView = new SceneView(this);
  readonly levels = new Levels(this);
  readonly viewModes = new ViewModes(this);
  readonly camera = new ViewCamera(this);
  readonly pages = new Pages(this);
  readonly edits = new EditHistory(this);
  readonly file = new DocumentFile(this);
  readonly display = new Display(this);
  readonly rendering: Rendering;
  readonly config: Config;

  /** Paramètres en vigueur (`config`). */
  get settings(): Settings {
    return this.config.settings;
  }

  readonly canvas: HTMLCanvasElement;
  readonly registry: ShapeRegistry;
  readonly modes: PageModeRegistry;
  readonly effects: PageEffectRegistry;
  /** « Courant » choisi du mode de chaque page (état de session, jamais écrit). */
  readonly modeCurrents = new Map<string, string>();
  readonly text: ReturnType<typeof createTroikaTextFactory>;
  readonly events = new Emitter<EngineEvents>();
  readonly controller: CameraController;

  readonly scenes: SceneManager;
  /** Texte en cours d'édition en place (son label dessiné est masqué). */
  labelEditing?: LabelEditRequest;
  disposed = false;

  readonly openUrl: (href: string) => void;
  selection: Selection | undefined;
  /** Contours de la sélection (style « contour »), un par élément sélectionné. */
  selectionObject: Group | undefined;
  /** Touche pour suivre un lien maintenue : zones liées de la page en évidence (`linkZonesObject`). */
  linkZonesShown = false;
  heldKeys: HeldKeys = { followLink: false, multiSelect: false };
  modeHint: ModeHint | undefined;
  linkZonesObject: Group | undefined;
  /** Contour animé : décalage des tirets (pixels écran) et boucle d'animation. */
  selectionPhase = 0;
  /** Voile de mise en valeur de la sélection, et de quoi l'annuler. */
  veil: { key: string; object: Object3D; restore: () => void } | undefined;
  /** Trou du voile autour d'une flèche sélectionnée (dépend du zoom : largeur fixe à l'écran). */
  veilHole: { key: string; object: Object3D } | undefined;
  selectionAnimation = 0;
  hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Transition en cours : de quoi l'interrompre proprement. */
  transition: { abort: () => void } | undefined;
  readonly history = new NavigationHistory();
  linkUsage: LinkUsage = {};
  /** Glisser d'édition en cours (déplacement, redimensionnement, connecteur). */
  drag: MoveDrag | ResizeDrag | ConnectDrag | EdgeEndDrag | EdgePointsDrag | LabelDrag | undefined;
  connectorPreview: Object3D | undefined;
  /** Contours des formes pour le clic (`shapeOutline`). */
  readonly outlines = new WeakMap<
    ShapeModel,
    { bounds: Rect; style: Record<string, string>; outline: Point[] | undefined }
  >();
  /** Poignées de la forme sélectionnée. */
  handlesObject: Object3D | undefined;
  /**
   * Dernière copie faite dans l'appli (ticket 59) : son XML, sa page d'origine et le parent de ses
   * éléments (pour recoller dans le même conteneur), et le décalage du prochain collage, en pas de grille.
   */
  clipboard: { xml: string; fileId?: string; pageId: string; parents: Map<string, string>; steps: number } | undefined;
  editable: boolean;

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? defaultShapeRegistry;
    this.modes = options.modes ?? defaultModeRegistry;
    this.effects = options.effects ?? defaultEffectRegistry;
    this.config = new Config(this, options);
    this.edits.undoStack.setLimit(this.settings.edit.undoLimit);
    if (this.settings.view.defaultMode !== 'top') {
      this.camera.state = withViewMode(
        this.camera.state,
        this.settings.view.defaultMode,
        this.camera.isoTilt(),
        this.camera.isoAzimuth(),
      );
    }
    this.openUrl = options.openUrl ?? defaultOpenUrl;
    this.editable = options.editable ?? false;
    this.rendering = new Rendering(this);
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.rendering.requestRender);
    this.scenes = new SceneManager(
      this.rendering.scene,
      (page, level) => this.sceneView.buildScene(page, level),
      this.settings.preload.maxCachedPages,
      (page) => this.sceneView.levelOf(page),
    );

    this.display.observe();

    this.controller = new CameraController(
      this.canvas,
      {
        getCameraState: () => this.camera.state,
        setCameraState: (state) => this.camera.setCameraState(state),
        getViewport: () => this.display.viewport,
        toggleOverview: (screen) => this.camera.toggleOverview(screen),
        click: (screen, options) => this.handleClick(screen, options.toggle, options.followLink),
        doubleClick: (screen, options) => this.handleDoubleClick(screen, options.followLink),
        heldKeys: (held) => this.setHeldKeys(held),
        hover: (screen) => this.handleHover(screen),
        back: () => this.back(),
        toggleViewMode: () => this.viewModes.toggleViewMode(),
        toggle3d: () => this.viewModes.toggle3d(),
        toggleMinimap: () => this.events.emit('minimapToggle'),
        toggleFlatten: () => this.viewModes.toggleFlatten(),
        toggleGraph: () => this.graph.toggleGraph(),
        beginMove: (screen) => this.beginMove(screen),
        moveTo: (screen, options) => this.moveTo(screen, options.snap),
        endMove: () => this.endMove(),
        canMarquee: (screen) => !!this.editablePage() && !this.pickAt(screen),
        selectInRect: (rect, options) => this.selectInRect(rect, options),
        selectAll: () => this.selectAll(),
        orderSelection: (move) => this.orderSelection(move),
        nudgeSelection: (direction, coarse) => this.nudgeSelection(direction, coarse),
        editSelection: () => this.editLabel(),
        deleteSelection: () => this.deleteSelection(),
        placementVariant: () => this.placementVariant(),
        canDeleteSelection: () => {
          const editable = this.editablePage();
          return !!editable && this.selection?.pageId === editable.page.id;
        },
        escape: () => this.clearSelection(),
        modeKey: (key) => this.modeKey(key),
      },
      this.config.effectiveControls(),
    );
  }

  // -------------------------------------------------------------------------
  // Création (SPEC §14.1)

  focusCanvas(): void {
    this.canvas.focus({ preventScroll: true });
  }

  isDragging(): boolean {
    return this.drag?.started === true;
  }

  isEditable(): boolean {
    return this.editable;
  }

  setEditable(editable: boolean): void {
    if (this.editable === editable) return;
    this.endMove();
    this.editable = editable;
    this.updateSelectionOutline();
  }

  addShape(template: ShapeTemplate, screen?: Point): string | undefined {
    const editable = this.editablePage();
    if (!editable) return undefined;
    const { page, pageTree } = editable;
    this.endMove();
    const at = screenToPage(
      this.camera.state,
      this.display.viewport,
      screen ?? { x: this.display.viewport.width / 2, y: this.display.viewport.height / 2 },
    );
    const bounds = dropBounds(template, at, gridSizeOf(pageTree));
    this.edits.recordEdit('Nouvelle forme');
    const style = withStyleValue(template.style, 'fontSize', String(this.settings.shapes.textSize));
    const id = addShapeCell(pageTree, { style, value: template.value, ...bounds });
    this.file.documentChanged([page.id]);
    const shape = this.pages.getCurrentPage()?.shapes.find((s) => s.id === id);
    if (shape) this.select({ type: 'shape', element: shape });
    return id;
  }

  /**
   * L'arbre a changé de structure : le modèle est relu de l'arbre, les scènes des pages touchées et
   * de la vue graphe sont reconstruites, la sélection est reprise par id.
   */
  /**
   * Ancrage automatique : après une édition, les flèches des formes touchées (et de leurs voisines) sont réparties
   * sur leurs côtés, écrit dans l'arbre XML (même étape d'annulation). Vrai si quelque chose a été écrit.
   */
  distributeAfterEdit(after: DocumentModel, changedPageIds: string[]): boolean {
    if (!this.editable) return false;
    let wrote = false;
    for (const pageId of changedPageIds) {
      const page = after.pages.find((p) => p.id === pageId);
      if (!page || this.anchoringOf(page) !== 'auto') continue;
      const shapeIds = affectedShapes(this.file.geometry.get(pageId), page);
      if (shapeIds.size > 0) wrote = this.writeDistribution(page, shapeIds) || wrote;
    }
    return wrote;
  }

  /** Écrit la répartition des flèches des formes `shapeIds` (et les coudes des boucles concernées). */
  writeDistribution(page: PageModel, shapeIds: ReadonlySet<string>): boolean {
    const pageTree = this.file.pageTreeOf(page.id);
    if (!pageTree) return false;
    const arrangement = arrangeAnchors(page, shapeIds, { seed: anchorSeedOf(page), route: this.avoidOptions() });
    return this.writeArrangement(page, pageTree, arrangement);
  }

  /** Réglages du tracé automatique ; undefined si le contournement est coupé (`shapes.edgeAutoRoute`). */
  avoidOptions(): AvoidOptions | undefined {
    const { shapes } = this.settings;
    if (!shapes.edgeAutoRoute) return undefined;
    return {
      clearance: shapes.edgeShapeClearance,
      spacing: shapes.edgeSpacing,
      stub: shapes.edgePortStub,
      crossingDetour: shapes.edgeCrossingDetour,
    };
  }

  /**
   * Écrit un agencement (points d'attache, puis tracés) dans l'arbre XML et le modèle de la page. Sans tracé
   * automatique, une flèche recalculée perd ses points intermédiaires (tracé de draw.io) ; une boucle sans tracé garde
   * ses coudes par défaut. Vrai si quelque chose a été écrit.
   */
  writeArrangement(page: PageModel, pageTree: PageTree, arrangement: Arrangement): boolean {
    let wrote = false;
    const loops = new Set<EdgeModel>();
    for (const { edgeId, end, constraint } of arrangement.constraints) {
      const edge = page.edges.find((e) => e.id === edgeId);
      if (!edge) continue;
      for (const [key, value] of Object.entries(constraintStyle(end, constraint))) {
        setCellStyleValue(pageTree, edgeId, key, value);
        if (value === undefined) delete edge.style[key];
        else edge.style[key] = value;
      }
      if (edge.sourceId && edge.sourceId === edge.targetId) loops.add(edge);
      wrote = true;
    }
    const { edgeIds, routes, routed } = arrangement;
    for (const edge of page.edges) {
      const loop = edge.sourceId !== undefined && edge.sourceId === edge.targetId;
      const points =
        routes.get(edge.id) ??
        (loops.has(edge) || (!routed && loop && edgeIds.has(edge.id))
          ? this.loopPoints(page, edge)
          : !routed && edgeIds.has(edge.id)
            ? []
            : undefined);
      if (!points || samePoints(points, edge.points)) continue;
      this.writeEdgePoints(page, pageTree, edge, points);
      edge.points = points;
      wrote = true;
    }
    return wrote;
  }

  /**
   * Autre agencement en ancrage automatique (touche F) : la graine de la page (`spatial.anchorSeed`) est augmentée
   * et les flèches réparties et retracées avec elle — autour de la flèche (ou de la forme) sélectionnée, sinon sur
   * toute la page. Les graines suivantes sont essayées (8 au plus) jusqu'à un agencement différent qui n'a pas plus
   * de croisements ni de superpositions que celui de la graine 0. Graine et modifications forment une seule étape
   * d'annulation. Faux si rien n'a changé.
   */
  otherArrangement(): boolean {
    const editable = this.editablePage();
    if (!editable || this.anchoringOf(editable.page) !== 'auto' || !this.file.xmlTree) return false;
    const { page, pageTree } = editable;
    const picked = this.selection?.pageId === page.id && !this.isMultiSelection() ? this.selection.picked : undefined;
    const around =
      picked?.type === 'edge'
        ? [picked.element.sourceId, picked.element.targetId].filter((id): id is string => !!id)
        : picked?.type === 'shape'
          ? [picked.element.id]
          : undefined;
    const shapeIds = around ? withNeighbours(page, around) : new Set(page.shapes.map((s) => s.id));
    const route = this.avoidOptions();
    const base = arrangementConflicts(page, arrangeAnchors(page, shapeIds, { seed: 0, route }));
    const current = anchorSeedOf(page);
    for (let k = 1; k <= 8; k++) {
      const seed = current + k;
      const arrangement = arrangeAnchors(page, shapeIds, { seed, route });
      if (!arrangementChanges(page, arrangement) || arrangementConflicts(page, arrangement) > base) continue;
      this.edits.recordEdit('Autre agencement');
      setPageAttribute(pageTree, SPATIAL.anchorSeed, String(seed));
      this.writeArrangement(page, pageTree, arrangement);
      // Pas de répartition derrière : elle déborderait de la zone choisie.
      this.file.documentChanged([page.id], { distribute: false });
      return true;
    }
    return false;
  }

  placementVariant(): boolean {
    const current = this.editablePage()?.page;
    if (current && this.anchoringOf(current) === 'auto') return this.otherArrangement();
    const editable = this.editableEdgeSelection();
    if (!editable || this.anchoringOf(editable.page) !== 'manual') return false;
    const { page, pageTree, edge } = editable;
    const variant = nextPlacementVariant(page, edge.id, this.settings.shapes.edgeLoopMargin);
    if (!variant) return false;
    this.edits.recordEdit('Variante de placement');
    for (const [key, value] of Object.entries({
      ...constraintStyle('source', variant.exit),
      ...constraintStyle('target', variant.entry),
    }))
      setCellStyleValue(pageTree, edge.id, key, value);
    this.writeEdgePoints(page, pageTree, edge, variant.points);
    this.file.documentChanged([page.id]);
    return true;
  }

  anchoringOf(page: PageModel): Anchoring {
    const own = page.attributes[SPATIAL.anchoring];
    return own === 'manual' || own === 'auto' ? own : this.settings.shapes.edgeAnchoring;
  }

  setPageAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    const page = this.pages.pageById(pageId);
    const pageTree = this.file.pageTreeOf(pageId);
    if (!this.file.xmlTree || !page || !pageTree?.diagram || !this.editable || this.transition) return;
    if ((page.attributes[SPATIAL.anchoring] ?? '') === (anchoring ?? '')) return;
    this.edits.recordEdit('Ancrage des flèches');
    setPageAttribute(pageTree, SPATIAL.anchoring, anchoring);
    const fresh = documentFromTree(this.file.xmlTree).pages.find((p) => p.id === pageId);
    if (fresh && this.anchoringOf(fresh) === 'auto')
      this.writeDistribution(fresh, new Set(fresh.shapes.map((s) => s.id)));
    this.file.documentChanged([pageId]);
  }

  jumpsOf(page: PageModel): JumpDefaults {
    const { edgeJumpStyle, edgeJumpSize } = this.settings.shapes;
    return { style: jumpValue(page.attributes[SPATIAL.jumps]) ?? edgeJumpStyle, size: edgeJumpSize };
  }

  /** Une flèche visible de la page saute en Arc ou en Marche : relief en volume (ticket 146). */
  hasRaisedJumps(page: PageModel): boolean {
    const jumps = this.jumpsOf(page);
    return page.edges.some((edge) => {
      const style = edge.visible && jumpStyleOf(edge.style, jumps);
      return style === 'arc' || style === 'sharp';
    });
  }

  setPageJumps(pageId: string, jumps: JumpDefaults['style'] | undefined): void {
    const page = this.pages.pageById(pageId);
    const pageTree = this.file.pageTreeOf(pageId);
    if (!this.file.xmlTree || !page || !pageTree?.diagram || !this.editable || this.transition) return;
    if ((page.attributes[SPATIAL.jumps] ?? '') === (jumps ?? '')) return;
    this.edits.recordEdit('Croisements des flèches');
    setPageAttribute(pageTree, SPATIAL.jumps, jumps);
    this.file.documentChanged([pageId], { distribute: false });
  }

  // -------------------------------------------------------------------------
  // Modes de vue (SPEC §9.1)

  // -------------------------------------------------------------------------
  // Vue graphe (SPEC §12)

  // -------------------------------------------------------------------------
  // Paramètres (SPEC §13)

  // -------------------------------------------------------------------------
  // Sélection et liens (SPEC §11)

  getSelection(): Selection | undefined {
    return this.selection;
  }

  isTransitioning(): boolean {
    return this.transition !== undefined;
  }

  pickAt(screen: Point): PickedElement | undefined {
    const page = this.pages.getCurrentPage();
    if (!page) return undefined;
    // Texte d'une flèche, même placé loin d'elle : la flèche.
    const text = this.edgeTextAt(screen);
    if (text) return { type: 'edge', element: text.edge };
    const point = screenToPage(this.camera.state, this.display.viewport, screen);
    return pickElement(page, point, {
      edgeTolerance: this.settings.edit.edgePickTolerance / this.camera.state.zoom,
      edgeRoute: (id) => {
        const data = this.sceneView.sceneObject(id)?.userData;
        return (data?.path ?? data?.route) as Point[] | undefined;
      },
      heightOf: (id) => this.sceneView.elementTop(id),
      baseOf: (id) => this.sceneView.volumeBase(id),
      pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
      contains: (shape, p) => this.registry.contains(shape, p, () => this.shapeOutline(shape)),
      pickable: (shape) => this.registry.isPickable(shape),
    });
  }

  /** Contour d'une forme (sa définition), mémorisé tant que ses bornes et son style ne changent pas. */
  shapeOutline(shape: ShapeModel): Point[] | undefined {
    const cached = this.outlines.get(shape);
    if (cached && cached.bounds === shape.bounds && cached.style === shape.style) return cached.outline;
    const outline = this.registry.resolve(shape).definition.outline?.(shape);
    this.outlines.set(shape, { bounds: shape.bounds, style: shape.style, outline });
    return outline;
  }

  select(picked: PickedElement | undefined): void {
    this.selectItems(picked ? [picked] : []);
  }

  toggleSelect(picked: PickedElement): void {
    const current = this.selection?.pageId === this.pages.currentPageId ? (this.selection?.items ?? []) : [];
    this.selectItems(toggleSelected(current, picked));
  }

  selectItems(items: PickedElement[]): void {
    const page = this.pages.getCurrentPage();
    const picked = items[items.length - 1];
    this.selection = picked && page ? { pageId: page.id, picked, items: [...items] } : undefined;
    this.updateSelectionOutline();
    this.syncSelectionAnimation();
    this.events.emit('selectionChange', this.selection);
    this.emitModeHint();
    if (page && items.length === 1) this.pickModeCurrent(page, items[0]!.element);
  }

  selectInRect(rect: Rect, options: { add: boolean; touch: boolean }): void {
    const page = this.pages.getCurrentPage();
    if (!page) return;
    const taken = this.selectableItems(page).filter((item) => {
      const footprint = this.screenFootprint(item);
      return footprint !== undefined && marqueeTakes(footprint, rect, options.touch);
    });
    const roots = takenRoots(page, taken);
    const current = options.add && this.selection?.pageId === page.id ? this.selection.items : [];
    const kept = current.filter((item) => !roots.some((r) => r.element.id === item.element.id));
    this.selectItems([...kept, ...roots]);
  }

  selectAll(): void {
    const page = this.pages.getCurrentPage();
    if (page) this.selectItems(takenRoots(page, this.selectableItems(page)));
  }

  /** Éléments sélectionnables de la page : visibles, sur un calque visible. */
  selectableItems(page: PageModel): PickedElement[] {
    const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
    return [
      ...page.shapes
        // Comme au clic : un groupe invisible n'est pris que s'il porte un lien (sinon on prend ses formes).
        .filter((s) => this.registry.isPickable(s))
        .map((element) => ({ type: 'shape' as const, element })),
      ...page.edges.map((element) => ({ type: 'edge' as const, element })),
    ].filter(({ element }) => element.visible && !hiddenLayers.has(element.layerId));
  }

  /** Emprise à l'écran d'un élément : base et dessus d'une forme, tracé d'une flèche. */
  screenFootprint(item: PickedElement): Footprint | undefined {
    const top = this.sceneView.elementTop(item.element.id);
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
    const route = this.sceneView.sceneObject(item.element.id)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    return { points: route.map((p) => this.screenOfPoint(p, top)), closed: false };
  }

  /** La sélection compte-t-elle plusieurs éléments ? */
  isMultiSelection(): boolean {
    return (this.selection?.items.length ?? 0) > 1;
  }

  clearSelection(): void {
    if (!this.selection) return;
    this.select(undefined);
  }

  preloadLink(link: LinkModel | undefined): void {
    if (link?.type !== 'page' || link.pageId === this.pages.currentPageId) return;
    const page = this.pages.pageById(link.pageId);
    if (page) this.scenes.prebuild(page);
  }

  followLink(elementId: string): void {
    const page = this.pages.getCurrentPage();
    const element = page && [...page.shapes, ...page.edges].find((e) => e.id === elementId);
    const link = element?.link;
    if (!page || !element || !isNavigableLink(link) || this.transition) return;
    if (link.type === 'url') {
      this.openUrl(link.href);
      return;
    }
    const target = this.pages.pageById(link.pageId);
    if (!target || target.id === page.id) return;

    const frame = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.sceneView.drawnBounds(elementId);
    this.history.push({ pageId: page.id, elementId, frame, camera: this.camera.state, targetPageId: target.id });
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
      destination:
        this.pages.pageCameras.get(target.id) ??
        fitBounds(target.bounds, this.display.viewport, this.camera.orientation()),
    });
  }

  getLinkUsage(): LinkUsage {
    return { ...this.linkUsage };
  }

  getHistory(): HistoryEntry[] {
    return this.history.entries();
  }

  getBackTarget(): BackTarget {
    const page = this.pages.getCurrentPage();
    if (!page || !this.file.document) return { kind: 'none' };
    const entry = this.history.peek();
    if (entry && entry.targetPageId === page.id) {
      const pageName = this.pages.pageById(entry.pageId)?.name ?? entry.pageId;
      return { kind: 'history', entry, pageName };
    }
    const parents = findParents(this.file.document, page.id, this.linkUsage);
    if (parents.length === 1) return { kind: 'parent', parent: parents[0]! };
    if (parents.length > 1) return { kind: 'choose', parents };
    return { kind: 'none' };
  }

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

  backTo(parentPageId: string): void {
    const page = this.pages.getCurrentPage();
    if (!page || !this.file.document || this.transition) return;
    const parent = findParents(this.file.document, page.id, this.linkUsage).find((p) => p.pageId === parentPageId);
    if (!parent) return;
    // La pile ne mène plus à la page courante : on repart d'une pile vide.
    this.history.clear();
    this.events.emit('historyChange', []);
    this.returnTo(parent.pageId, parent.frame, this.pages.pageCameras.get(parent.pageId));
  }

  returnTo(pageId: string, frame: Rect | undefined, camera: CameraState | undefined): void {
    const inner = this.pages.getCurrentPage();
    const outer = this.pages.pageById(pageId);
    if (!inner || !outer) return;
    const destination = camera ?? fitBounds(outer.bounds, this.display.viewport, this.camera.orientation());
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
  runTransition(options: {
    direction: 'in' | 'out';
    outer: PageModel;
    inner: PageModel;
    frame: Rect | undefined;
    destination: CameraState;
  }): void {
    const { direction, outer, inner, frame, destination } = options;
    const from = this.pages.getCurrentPage();
    const to = direction === 'in' ? inner : outer;
    if (!from || this.transition) return;

    if (
      !frame ||
      !this.settings.transition.enabled ||
      this.config.reducedMotion() ||
      this.settings.transition.durationMs <= 0
    ) {
      if (direction === 'in') this.pages.pageCameras.set(outer.id, this.camera.state);
      this.pages.pageCameras.set(to.id, destination);
      this.pages.goToPage(to.id);
      return;
    }

    cancelAnimationFrame(this.camera.animation);
    this.camera.animation = 0;
    this.clearSelection();
    const embedding = embedIn(inner.bounds, frame);
    const outerScene = this.scenes.prebuild(outer);
    const innerScene = this.scenes.prebuild(inner);

    // Caméras de départ et d'arrivée, exprimées dans le repère de la page extérieure.
    const startCamera = direction === 'in' ? this.camera.state : embeddedCamera(this.camera.state, embedding);
    const endCamera = direction === 'in' ? embeddedCamera(destination, embedding) : destination;
    const outerCameraBefore = direction === 'in' ? this.camera.state : undefined;

    // Pendant la transition, la page courante est l'extérieure ; l'intérieure est posée dans la forme.
    this.pages.currentPageId = outer.id;
    this.scenes.show(outer);
    this.minimap.invalidate();
    innerScene.root.visible = true;
    setPageTransform(innerScene.root, embedding);
    const innerAlpha = (fade: number) => (direction === 'in' ? fade : 1 - fade);
    setPageOpacity(innerScene.root, innerAlpha(0));
    setPageOpacity(outerScene.root, 1 - innerAlpha(0));
    this.camera.applyCamera(startCamera);

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
      this.camera.animation = 0;
      this.controller.setEnabled(true);
      // Touche toujours maintenue : les zones liées de la page d'arrivée.
      this.updateLinkZones();
      this.events.emit('transitionEnd', this.pages.currentPageId ?? to.id);
    };
    this.transition = {
      abort: () => {
        // On reste sur la page extérieure, à la vue courante.
        cancelAnimationFrame(this.camera.animation);
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
        this.camera.applyCamera(interpolateCamera(startCamera, endCamera, ease(t)));
        const fade = phase(t, fadeStart, fadeEnd);
        setPageOpacity(innerScene.root, innerAlpha(fade));
        setPageOpacity(outerScene.root, 1 - innerAlpha(fade));
        this.camera.animation = requestAnimationFrame(step);
        return;
      }
      // Arrivée : même image à l'écran, sur la page de destination sans transformation.
      restore();
      if (outerCameraBefore) this.pages.pageCameras.set(outer.id, outerCameraBefore);
      this.viewModes.applyPageIso(to.id);
      this.pages.currentPageId = to.id;
      if (to.id !== GRAPH_PAGE_ID) this.pages.lastDocumentPageId = to.id;
      this.scenes.show(to);
      this.minimap.invalidate();
      this.camera.applyCamera(destination);
      this.events.emit('pageChange', to);
      finish();
    };
    this.camera.animation = requestAnimationFrame(step);
  }

  // -------------------------------------------------------------------------
  // Édition à la souris (SPEC §14.1) : déplacer, redimensionner, connecter

  /** Page courante modifiable (pas la vue graphe, ni une page illisible) et son arbre XML. */
  editablePage(): { page: PageModel; pageTree: PageTree } | undefined {
    if (!this.editable) return undefined;
    const page = this.pages.getCurrentPage();
    if (!page || page.id === GRAPH_PAGE_ID || this.transition) return undefined;
    const pageTree = this.file.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return { page, pageTree };
  }

  /** Forme sélectionnée sur la page courante, si on peut la modifier (poignées affichées). */
  editableSelection(): { page: PageModel; pageTree: PageTree; shape: ShapeModel } | undefined {
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
  editableEdgeSelection(): { page: PageModel; pageTree: PageTree; edge: EdgeModel } | undefined {
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
  edgeHandlesSelection(): ReturnType<EngineCore['editableEdgeSelection']> {
    const editable = this.editableEdgeSelection();
    const editing = this.labelEditing;
    const editingMiddle = editing?.elementId === editable?.edge.id && !editing?.end && !editing?.labelCellId;
    return editingMiddle ? undefined : editable;
  }

  /** Bouts du tracé d'une flèche, en coordonnées page (objet éventuellement décalé en cours de glisser). */
  edgeEndPoints(edgeId: string): Record<TerminalEnd, Point> | undefined {
    const object = this.sceneView.sceneObject(edgeId);
    const route = object?.userData.route as Point[] | undefined;
    if (!object || !route || route.length < 2) return undefined;
    const at = (p: Point) => ({ x: p.x + object.position.x, y: p.y + object.position.y });
    return { source: at(route[0]!), target: at(route[route.length - 1]!) };
  }

  /** Bout de la flèche sélectionnée sous un point écran (tolérance des poignées). */
  edgeEndAt(screen: Point): TerminalEnd | undefined {
    const edge = this.edgeHandlesSelection()?.edge;
    const ends = edge && this.edgeEndPoints(edge.id);
    if (!edge || !ends) return undefined;
    const top = this.sceneView.elementTop(edge.id);
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
  pointsContext(page: PageModel, edge: EdgeModel): PointsContext | undefined {
    const object = this.sceneView.sceneObject(edge.id);
    const raw = object?.userData.points as Point[] | undefined;
    if (!object || !raw || raw.length < 2) return undefined;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const source = toTerminal(shapes.get(edge.sourceId ?? ''));
    const target = toTerminal(shapes.get(edge.targetId ?? ''));
    const sourceFixed = source && fixedAnchor(source, edge.style, 'source');
    const targetFixed = target && fixedAnchor(target, edge.style, 'target');
    const { zoom } = this.camera.state;
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
      tolerance: this.settings.edit.edgePointAlignTolerance / zoom,
      handleRadius: (this.settings.edit.handleSize * 1.5) / zoom,
    };
  }

  /** Poignée entre les bouts de la flèche sélectionnée sous un point écran. */
  pointHandleAt(screen: Point): PointHandle | undefined {
    const editable = this.edgeHandlesSelection();
    const context = editable && this.pointsContext(editable.page, editable.edge);
    if (!editable || !context) return undefined;
    const top = this.sceneView.elementTop(editable.edge.id);
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
  pointHandleCursor(handle: PointHandle, style: Record<string, string>): string {
    if (handle.kind === 'segment') return handle.vertical ? 'col-resize' : 'row-resize';
    if (handle.kind === 'elbow')
      return style.edgeStyle === 'topToBottomEdgeStyle' ||
        (style.edgeStyle === 'elbowEdgeStyle' && style.elbow === 'vertical')
        ? 'row-resize'
        : 'col-resize';
    return 'move';
  }

  /** Écrit les points intermédiaires d'une flèche (repère de son parent, comme draw.io). */
  writeEdgePoints(page: PageModel, pageTree: PageTree, edge: EdgeModel, points: Point[]): void {
    const origin = page.shapes.find((s) => s.id === edge.parentId)?.bounds ?? { x: 0, y: 0 };
    setEdgePoints(
      pageTree,
      edge.id,
      points.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y })),
    );
  }

  resetEdgeRoute(edgeId: string): void {
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge) return;
    const keys = ['exit', 'entry'].flatMap((prefix) =>
      ['X', 'Y', 'Dx', 'Dy', 'Perimeter'].map((suffix) => `${prefix}${suffix}`),
    );
    const constrained = keys.some((key) => edge.style[key] !== undefined);
    if (edge.points.length === 0 && !constrained) return;
    this.edits.recordEdit('Tracé automatique');
    setEdgePoints(editable.pageTree, edge.id, []);
    for (const key of keys) setCellStyleValue(editable.pageTree, edge.id, key, undefined);
    this.file.documentChanged([editable.page.id]);
  }

  /**
   * Accroche d'un bout de flèche sous le pointeur, comme draw.io : point de connexion proche (attache
   * fixe), sinon intérieur d'une forme (attache auto), sinon un point libre au niveau de la flèche.
   */
  endAttachmentAt(
    page: PageModel,
    screen: Point,
    options: {
      exclude?: string;
      skip?: AnchorSkip;
      taken?: TakenAnchor[];
      height: number;
      snap: boolean;
      grid: number;
    },
  ): EndAttachment {
    if (this.anchoringOf(page) === 'auto') {
      // Ancrage automatique : on ne vise que le côté de la forme (le plus proche du pointeur) ; la répartition suit.
      const shape = this.shapeAt(screen, options.exclude);
      if (shape) {
        const pointer = this.groundPointAtHeight(screen, this.sceneView.elementTop(shape.id));
        const side = sideOfConstraint(frameConstraint(shape.bounds, pointer)) ?? 'n';
        return { kind: 'fixed', shapeId: shape.id, constraint: sideMiddle(side) };
      }
    }
    const shapes =
      this.anchoringOf(page) === 'auto'
        ? []
        : connectableShapes(page, this.registry).filter((s) => s.id !== options.exclude);
    let best: { shapeId: string; constraint: Point; distance: number } | undefined;
    for (const shape of shapes) {
      const top = this.sceneView.elementTop(shape.id);
      for (const { constraint } of this.anchorsOf(page, shape, options.skip, options.taken)) {
        const at = this.screenOfPoint(this.anchorPosition(shape, constraint), top);
        const distance = Math.hypot(at.x - screen.x, at.y - screen.y);
        if (distance <= this.settings.edit.handlePickTolerance * 1.5 && (!best || distance < best.distance))
          best = { shapeId: shape.id, constraint, distance };
      }
    }
    if (best) return { kind: 'fixed', shapeId: best.shapeId, constraint: { ...best.constraint } };
    const shape = this.shapeAt(screen, options.exclude);
    if (shape) return { kind: 'floating', shapeId: shape.id };
    const point = this.groundPointAtHeight(screen, options.height);
    const step = options.snap && options.grid > 0 ? options.grid : 1;
    return { kind: 'free', point: { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step } };
  }

  /**
   * Points d'ancrage d'une forme (mode manuel) : les bouts en attache auto comptent au point où leur tracé touche la
   * forme ; le bout en cours de déplacement compte à sa place d'origine.
   */
  anchorsOf(page: PageModel, shape: ShapeModel, skip?: AnchorSkip, taken: TakenAnchor[] = []): Anchor[] {
    return shapeAnchors(shape.id, page.edges, {
      skip,
      extra: [...(skip?.origin ? [skip.origin] : []), ...taken]
        .filter((a) => a.shapeId === shape.id)
        .map((a) => a.constraint),
      floatingAt: (edge, end) => {
        const point = this.edgeEndPoints(edge.id)?.[end];
        return point && frameConstraint(shape.bounds, point);
      },
    });
  }

  /** Point d'ancrage occupé par un bout de flèche attaché à une forme (fixe, ou touché par l'attache auto). */
  endAnchor(page: PageModel, edge: EdgeModel, end: TerminalEnd): { shapeId: string; constraint: Point } | undefined {
    const attachment = endAttachmentOf(edge, end);
    if (attachment?.kind === 'fixed') return { shapeId: attachment.shapeId, constraint: attachment.constraint };
    const shape = attachment?.kind === 'floating' && page.shapes.find((s) => s.id === attachment.shapeId);
    const point = shape && this.edgeEndPoints(edge.id)?.[end];
    return shape && point ? { shapeId: shape.id, constraint: frameConstraint(shape.bounds, point) } : undefined;
  }

  /** Point d'ancrage libre d'une forme (sur un côté donné, ou tous) le plus proche d'un point de la page. */
  nearestFreeAnchor(
    page: PageModel,
    shape: ShapeModel,
    toward: Point,
    side?: ConnectSide,
    taken: TakenAnchor[] = [],
  ): { constraint: Point; point: Point } | undefined {
    let best: { constraint: Point; point: Point; distance: number } | undefined;
    for (const anchor of this.anchorsOf(page, shape, undefined, taken)) {
      if (anchor.used || !anchor.side || (side && anchor.side !== side)) continue;
      const point = this.anchorPosition(shape, anchor.constraint);
      const distance = Math.hypot(point.x - toward.x, point.y - toward.y);
      if (!best || distance < best.distance) best = { constraint: anchor.constraint, point, distance };
    }
    return best && { constraint: best.constraint, point: best.point };
  }

  /** Coudes d'une flèche qui boucle sur sa forme par deux points fixes ; undefined si ce n'en est pas une. */
  loopPoints(page: PageModel, edge: EdgeModel): Point[] | undefined {
    const shape = edge.sourceId === edge.targetId && page.shapes.find((s) => s.id === edge.sourceId);
    const from = endAttachmentOf(edge, 'source');
    const to = endAttachmentOf(edge, 'target');
    if (!shape || from?.kind !== 'fixed' || to?.kind !== 'fixed') return undefined;
    return this.loopBetween(shape, from.constraint, to.constraint);
  }

  /**
   * Ancrage manuel : bout d'une flèche orthogonale à coudes posé sur un point d'ancrage ; si le tracé longe le côté,
   * coudes qui le font arriver à angle droit (`squareEnd`), sinon undefined.
   */
  squaredEndPoints(page: PageModel, edge: EdgeModel, end: TerminalEnd, attachment: EndAttachment): Point[] | undefined {
    if (this.anchoringOf(page) !== 'manual' || attachment.kind !== 'fixed') return undefined;
    if (edge.points.length === 0 || edge.sourceId === edge.targetId || pointsEditor(edge.style) !== 'segments')
      return undefined;
    const side = sideOfConstraint(attachment.constraint);
    if (!side) return undefined;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const source = toTerminal(shapes.get(edge.sourceId ?? ''));
    const target = toTerminal(shapes.get(edge.targetId ?? ''));
    const reroute = (waypoints: Point[]) =>
      routeEdgePoints({
        source,
        target,
        sourcePoint: edge.sourcePoint,
        targetPoint: edge.targetPoint,
        waypoints,
        style: edge.style,
      });
    return squareEnd(reroute(edge.points), end, side, reroute);
  }

  /** Coudes d'une boucle entre deux points d'ancrage d'une forme (hors de la forme, `loopWaypoints`). */
  loopBetween(shape: ShapeModel, from: Point, to: Point): Point[] | undefined {
    const end = (c: Point) => {
      const side = sideOfConstraint(c);
      return side && { point: this.anchorPosition(shape, c), side };
    };
    const a = end(from);
    const b = end(to);
    return a && b ? loopWaypoints(shape.bounds, a, b, this.settings.shapes.edgeLoopMargin) : undefined;
  }

  /** Position d'un point d'ancrage sur la page, projeté sur le contour de la forme comme le tracé. */
  anchorPosition(shape: ShapeModel, constraint: Point): Point {
    const terminal = toTerminal(shape);
    const style = { exitX: String(constraint.x), exitY: String(constraint.y) };
    return (
      (terminal && fixedAnchor(terminal, style, 'source')) ?? {
        x: shape.bounds.x + constraint.x * shape.bounds.width,
        y: shape.bounds.y + constraint.y * shape.bounds.height,
      }
    );
  }

  /** Forme sous un point écran à laquelle on peut attacher une flèche (les flèches sont ignorées). */
  shapeAt(screen: Point, exclude?: string): ShapeModel | undefined {
    const page = this.pages.getCurrentPage();
    if (!page) return undefined;
    const connectable = new Set(connectableShapes(page, this.registry).map((s) => s.id));
    const picked = pickElement(
      { ...page, shapes: page.shapes.filter((s) => connectable.has(s.id) && s.id !== exclude), edges: [] },
      screenToPage(this.camera.state, this.display.viewport, screen),
      {
        edgeTolerance: 0,
        edgeRoute: () => undefined,
        heightOf: (id) => this.sceneView.elementTop(id),
        baseOf: (id) => this.sceneView.volumeBase(id),
        pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
        contains: (shape, p) => this.registry.contains(shape, p, () => this.shapeOutline(shape)),
      },
    );
    return picked?.type === 'shape' ? picked.element : undefined;
  }

  /** Repères d'accroche (contour, points de connexion) sur la forme visée par un bout de flèche. */
  showConnectionHints(
    page: PageModel,
    attachment: EndAttachment | undefined,
    extra?: Object3D,
    skip?: AnchorSkip,
    taken: TakenAnchor[] = [],
  ): void {
    this.clearConnectorPreview();
    const root = this.scenes.current?.root;
    if (!root) return;
    const group = new Group();
    group.name = 'connector-preview';
    if (extra) group.add(extra);
    const shape =
      attachment && attachment.kind !== 'free' ? page.shapes.find((s) => s.id === attachment.shapeId) : undefined;
    if (shape && attachment?.kind === 'fixed' && this.anchoringOf(page) === 'auto') {
      // Ancrage automatique : le côté visé est surligné.
      const side = sideOfConstraint(attachment.constraint);
      const b = shape.bounds;
      const corners: Record<string, [Point, Point]> = {
        n: [
          { x: b.x, y: b.y },
          { x: b.x + b.width, y: b.y },
        ],
        e: [
          { x: b.x + b.width, y: b.y },
          { x: b.x + b.width, y: b.y + b.height },
        ],
        s: [
          { x: b.x, y: b.y + b.height },
          { x: b.x + b.width, y: b.y + b.height },
        ],
        w: [
          { x: b.x, y: b.y },
          { x: b.x, y: b.y + b.height },
        ],
      };
      const hints = connectionHints(
        { bounds: b, perimeter: 'rectangle', style: shape.style },
        [],
        this.camera.state.zoom,
        { outline: false, side: side && corners[side], accent: this.settings.selection.accentColor },
      );
      hints.position.z = this.sceneView.elementTop(shape.id) + 0.3;
      group.add(hints);
    } else if (shape && attachment?.kind !== 'free') {
      const anchors = this.anchorsOf(page, shape, skip, taken);
      const active =
        attachment?.kind === 'fixed'
          ? anchors.findIndex(
              (a) => a.constraint.x === attachment.constraint.x && a.constraint.y === attachment.constraint.y,
            )
          : undefined;
      const hints = connectionHints(
        {
          bounds: shape.bounds,
          perimeter: perimeterKind(shape.style, parseStyle(shape.raw?.styleString).names),
          style: shape.style,
        },
        anchors.map((a) => ({ point: this.anchorPosition(shape, a.constraint), used: a.used })),
        this.camera.state.zoom,
        { active, outline: attachment?.kind === 'floating', accent: this.settings.selection.accentColor },
      );
      hints.position.z = this.sceneView.elementTop(shape.id) + 0.3;
      group.add(hints);
    }
    group.traverse((o) => {
      o.renderOrder = Number.MAX_SAFE_INTEGER;
      if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
    });
    this.connectorPreview = group;
    root.add(group);
    this.rendering.requestRender();
  }

  /** Point écran d'un point de la page posé à `height` au-dessus du sol (inverse de `groundPointAtHeight`). */
  screenOfPoint(point: Point, height: number): Point {
    return pageToScreen(this.camera.state, this.display.viewport, point, height);
  }

  /** Disposition des poignées de la sélection (paramètres d'édition). */
  handleLayout(): HandleLayout {
    const { connectHandleOffset, middleHandleMinSpan } = this.settings.edit;
    return { connectOffset: connectHandleOffset, middleMinSpan: middleHandleMinSpan };
  }

  /** Poignée de la sélection sous un point écran (tolérance : `edit.handlePickTolerance`). */
  handleAt(screen: Point): HandleKind | undefined {
    const editable = this.editableSelection();
    if (!editable) return undefined;
    const { shape } = editable;
    const top = this.sceneView.elementTop(shape.id);
    const resizable = this.registry.isResizable(shape);
    let best: { kind: HandleKind; distance: number } | undefined;
    for (const { kind, point } of handlePoints(shape.bounds, this.camera.state.zoom, this.handleLayout())) {
      if (!isConnectHandle(kind) && !resizable) continue;
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
  beginMove(screen: Point): boolean {
    const editable = this.editablePage();
    if (!editable) return false;
    const { page, pageTree } = editable;
    const start = screenToPage(this.camera.state, this.display.viewport, screen);
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
        origin: this.endAnchor(page, selectedEdge, end),
        originalPoints: selectedEdge.points.map((p) => ({ ...p })),
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
      this.drag = isConnectHandle(handle)
        ? { kind: 'connect', pageId: page.id, sourceId: selected.id, side: connectSideOf(handle), started: false }
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
    const shape = moveTarget(page, picked.element, this.registry);
    if (isLocked(shape) || !canMoveCell(pageTree, shape.id)) return false;
    // Forme saisie dans une sélection multiple : toutes les formes sélectionnées bougent ensemble
    // (celles qu'on ne peut pas déplacer restent en place).
    const selection = this.selection;
    const grabbedSelected =
      this.isMultiSelection() &&
      selection?.pageId === page.id &&
      selection.items.some(
        (item) => item.type === 'shape' && moveTarget(page, item.element, this.registry).id === shape.id,
      );
    const candidates = grabbedSelected
      ? [
          shape.id,
          ...selection!.items
            .filter((item) => item.type === 'shape')
            .map((item) => moveTarget(page, item.element, this.registry))
            .filter((target) => !isLocked(target) && canMoveCell(pageTree, target.id))
            .map((target) => target.id),
        ]
      : [shape.id];
    const edgeIds = grabbedSelected
      ? selection!.items.filter((item) => item.type === 'edge').map((item) => item.element.id)
      : [];
    this.drag = this.moveDrag(page, pageTree, candidates, edgeIds, start, shape.bounds, grid);
    return true;
  }

  /**
   * Déplacement de formes (`shapeIds`, déjà déplaçables) et de flèches ensemble : une forme prise avec son
   * conteneur bouge avec lui ; une flèche dont une forme reste en place en est détachée.
   */
  moveDrag(
    page: PageModel,
    pageTree: PageTree,
    shapeIds: string[],
    edgeIds: string[],
    start: Point,
    origin: Rect,
    grid: number,
  ): MoveDrag {
    const sets = new Map<string, MoveSet>();
    const setOf = (id: string) => {
      if (!sets.has(id)) sets.set(id, collectMoveSet(page, id));
      return sets.get(id)!;
    };
    const rootIds = independentRoots(shapeIds, (id) => setOf(id).shapeIds);
    const set = unionMoveSets(rootIds.map(setOf));
    // Flèches de la sélection qui bougent d'elles-mêmes (une flèche d'un groupe déplacé suit déjà).
    const edges: MoveDrag['edges'] = [];
    for (const id of edgeIds) {
      const edge = page.edges.find((e) => e.id === id);
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
    return {
      kind: 'move',
      pageId: page.id,
      rootIds,
      set,
      edges,
      start,
      origin: { ...origin },
      applied: { x: 0, y: 0 },
      grid,
      started: false,
    };
  }

  nudgeSelection(direction: Point, coarse: boolean): boolean {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || this.drag || selection?.pageId !== editable.page.id) return false;
    const { page, pageTree } = editable;
    const shapes = selection.items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.registry))
      .filter((shape) => !isLocked(shape) && canMoveCell(pageTree, shape.id));
    const edgeIds = selection.items.filter((item) => item.type === 'edge').map((item) => item.element.id);
    const grid = gridSizeOf(pageTree);
    const origin = shapes[0]?.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
    const start = { x: 0, y: 0 };
    const drag = this.moveDrag(
      page,
      pageTree,
      shapes.map((shape) => shape.id),
      edgeIds,
      start,
      origin,
      grid,
    );
    if (drag.rootIds.length === 0 && drag.edges.length === 0) return false;
    const { nudgeStep, nudgeCoarseStep } = this.settings.edit;
    const onGrid = coarse && nudgeCoarseStep === 0;
    const step = onGrid ? grid : coarse ? nudgeCoarseStep : nudgeStep;
    this.drag = drag;
    this.dragMove(page, drag, { x: direction.x * step, y: direction.y * step }, onGrid);
    this.endMove();
    return true;
  }

  /**
   * Suit le pointeur, mesuré au sol (projection orthographique, identique à toute hauteur : une
   * forme en volume reste sous le curseur). Modèle et scène sont mis à jour en place.
   */
  moveTo(screen: Point, snap: boolean): void {
    const drag = this.drag;
    const page = this.pages.getCurrentPage();
    if (!drag || page?.id !== drag.pageId) return;
    const point = screenToPage(this.camera.state, this.display.viewport, screen);
    if (drag.kind === 'move') this.dragMove(page, drag, point, snap);
    else if (drag.kind === 'resize') this.dragResize(page, drag, point, snap);
    else if (drag.kind === 'label') this.dragLabel(page, drag, screen);
    else if (drag.kind === 'edgeEnd') this.dragEdgeEnd(page, drag, screen, snap);
    else if (drag.kind === 'edgePoints') this.dragEdgePoints(page, drag, screen, snap);
    else this.dragConnect(page, drag, screen);
  }

  /** Texte de flèche suivant le pointeur : le point du tracé le plus proche, et l'écart de côté. */
  dragLabel(page: PageModel, drag: LabelDrag, screen: Point): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const route = this.sceneView.sceneObject(drag.edgeId)?.userData.route as Point[] | undefined;
    if (!edge || !route?.length) return;
    drag.started = true;
    const point = this.groundPointAtHeight(screen, this.sceneView.elementTop(drag.edgeId));
    let placement = placementAt(route, point, drag.offset);
    // Texte du milieu qui suit la flèche, glissé le long du trait : le point visé est celui du texte glissé.
    const shift = drag.cellId === edge.id ? this.followedText(edge.id)?.shift : undefined;
    if (shift) {
      const position = Math.min(1, Math.max(-1, placement.position - (2 * shift) / polylineLength(route)));
      placement = { ...placement, position };
    }
    drag.placement = placement;
    setEdgeTextPlacement(edge, drag.cellId, placement);
    this.retraceEdges(page, new Set([edge.id]));
    this.afterLiveEdit();
  }

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
    this.edits.recordEdit('Texte');
    if (!value) removeCells(editable.pageTree, [cellId]);
    else if (rich === undefined) setCellLabel(editable.pageTree, cellId, value);
    else setCellRichLabel(editable.pageTree, cellId, rich);
    this.file.documentChanged([editable.page.id]);
  }

  moveEditedText(screen: Point): void {
    const editing = this.labelEditing;
    const page = this.pages.getCurrentPage();
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

  endEditedTextMove(): void {
    if (this.drag?.kind !== 'label') return;
    this.endMove();
    this.relocateLabelEdit();
  }

  /**
   * Texte de flèche sous un point écran (sa boîte de texte dessinée, où qu'il soit placé) : le plus
   * haut dans l'ordre de dessin. Cliquer un texte éloigné de sa flèche la sélectionne.
   */
  edgeTextAt(screen: Point): { edge: EdgeModel; cellId: string } | undefined {
    const page = this.pages.getCurrentPage();
    const root = this.scenes.current?.root;
    if (!page || !root) return undefined;
    root.updateMatrixWorld();
    const toPage = new Matrix4().copy(root.matrixWorld).invert();
    const padding = 2 / this.camera.state.zoom;
    for (const edge of [...page.edges].reverse()) {
      const object = this.sceneView.sceneObject(edge.id);
      if (!object?.visible) continue;
      const point = this.groundPointAtHeight(screen, this.sceneView.elementTop(edge.id));
      let hit: string | undefined;
      object.traverse((child) => {
        const cellId = child.userData.labelCellId as string | undefined;
        if (hit || !cellId || !child.visible) return;
        // Texte le long du trait : la boîte tournée de chaque lettre (un coude ne fait pas une grande zone).
        if (child.userData.alongPath) {
          if (drawnGlyphQuads(child, toPage).some((quad) => nearPolygon(quad, point, padding))) hit = cellId;
          return;
        }
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
    const route = this.sceneView.sceneObject(edgeId)?.userData.route as Point[] | undefined;
    if (!route?.length) return;
    // Même configuration qu'un texte créé à cet endroit : placement et alignement.
    const layout = edgeTextLayout(route, anchor, false, this.endTextGap());
    this.edits.recordEdit('Position du texte');
    setLabelPlacement(editable.pageTree, cellId, layout.placement);
    const centered = anchor === 'middle';
    setCellStyleValue(editable.pageTree, cellId, 'align', centered ? undefined : layout.align);
    setCellStyleValue(editable.pageTree, cellId, 'verticalAlign', centered ? undefined : layout.verticalAlign);
    this.file.documentChanged([editable.page.id]);
  }

  /** Écarts du placement par défaut des textes de début / fin (paramètres). */
  endTextGap(): EndTextGap {
    return { along: this.settings.shapes.edgeEndTextGapAlong, across: this.settings.shapes.edgeEndTextGapAcross };
  }

  /** Configuration par défaut d'un texte de début / fin d'une flèche de la page courante. */
  endTextLayout(edgeId: string, end: EdgeEnd, flipped = false): EdgeTextLayout {
    const route = (this.sceneView.sceneObject(edgeId)?.userData.route as Point[] | undefined) ?? [];
    return edgeTextLayout(route, end, flipped, this.endTextGap());
  }

  /** Demande d'édition complétée de la bascule possible (texte de début / fin en configuration par défaut). */
  withFlip(request: LabelEditRequest): LabelEditRequest {
    const edge = this.pages.getCurrentPage()?.edges.find((e) => e.id === request.elementId);
    const route = this.sceneView.sceneObject(request.elementId)?.userData.route as Point[] | undefined;
    const rest = { ...request };
    delete rest.flip;
    if (!request.onEdge || !request.end || !edge || !route?.length) return rest;
    const child = request.labelCellId ? edge.labels.find((l) => l.id === request.labelCellId) : undefined;
    const placement =
      child?.placement ?? edgeTextLayout(route, request.end, request.flipped, this.endTextGap()).placement;
    const target = flipTarget(route, request.end, placement, child?.style ?? request.style, this.endTextGap());
    return target ? { ...rest, flip: target.direction } : rest;
  }

  /** Texte du milieu d'une flèche qui la suit : où ses lettres sont posées ; undefined s'il est horizontal. */
  followedText(edgeId: string): TextAlong | undefined {
    const edge = this.pages.getCurrentPage()?.edges.find((e) => e.id === edgeId);
    return edge && middleTextAlong(edge, this.sceneView.sceneObject(edgeId)?.userData.path as Point[] | undefined);
  }

  /** Angle de l'éditeur d'un texte du milieu qui suit sa flèche : celui du trait dessiné au point du texte, à l'écran. */
  withAngle(request: LabelEditRequest): LabelEditRequest {
    const rest = { ...request };
    delete rest.angle;
    const along =
      !request.onEdge || request.end || request.labelCellId ? undefined : this.followedText(request.elementId);
    if (!along) return rest;
    const { point, tangent } = alongAnchor(along);
    const top = this.sceneView.elementTop(request.elementId);
    const from = this.screenOfPoint(point, top);
    const to = this.screenOfPoint({ x: point.x + tangent.x * 10, y: point.y + tangent.y * 10 }, top);
    let angle = Math.atan2(to.y - from.y, to.x - from.x);
    // Jamais à l'envers, comme le texte dessiné.
    if (angle > Math.PI / 2 + 1e-9) angle -= Math.PI;
    else if (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI;
    return Math.abs(angle) < 1e-9 ? rest : { ...rest, angle };
  }

  flipEditedText(): void {
    const editing = this.labelEditing;
    const editable = this.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === editing?.elementId);
    const route = edge && (this.sceneView.sceneObject(edge.id)?.userData.route as Point[] | undefined);
    if (!editing?.onEdge || !editing.end || !editable || !edge || !route?.length) return;
    const child = editing.labelCellId ? edge.labels.find((l) => l.id === editing.labelCellId) : undefined;
    let next: LabelEditRequest;
    if (child) {
      const target = flipTarget(route, editing.end, child.placement, child.style, this.endTextGap());
      if (!target) return;
      this.edits.recordEdit('Côté du texte');
      setLabelPlacement(editable.pageTree, child.id, target.layout.placement);
      setCellStyleValue(editable.pageTree, child.id, 'align', target.layout.align);
      setCellStyleValue(editable.pageTree, child.id, 'verticalAlign', target.layout.verticalAlign);
      this.file.documentChanged([editable.page.id]);
      const style = this.pages
        .getCurrentPage()
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
    this.labelEditing = this.withAngle(this.withFlip({ ...next, screen: screen ?? next.screen }));
    this.events.emit('labelEdit', this.labelEditing);
  }

  /** Style d'un texte de début / fin créé : taille et couleur (paramètres), alignement de sa configuration. */
  endTextStyle(layout: EdgeTextLayout): Record<string, string> {
    return {
      fontSize: String(this.settings.shapes.edgeEndTextSize),
      fontColor: this.settings.shapes.edgeEndTextColor,
      align: layout.align,
      verticalAlign: layout.verticalAlign,
    };
  }

  dragMove(page: PageModel, move: MoveDrag, point: Point, snap: boolean): void {
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
    this.retraceEdges(page, move.set.connectedEdgeIds, move.set.edgeIds);
    this.afterLiveEdit();
  }

  dragResize(page: PageModel, resize: ResizeDrag, point: Point, snap: boolean): void {
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
    this.retraceEdges(page, resize.children.connectedEdgeIds, content.edgeIds);
    this.afterLiveEdit();
  }

  dragConnect(page: PageModel, connect: ConnectDrag, screen: Point): void {
    const source = page.shapes.find((s) => s.id === connect.sourceId);
    if (!source) return;
    connect.started = true;
    const top = this.sceneView.elementTop(source.id);
    const sideExit = CONNECT_DIRECTIONS[connect.side].exit;
    if (this.anchoringOf(page) === 'auto') {
      // Ancrage automatique : départ et arrivée au milieu des côtés choisis, répartis à l'écriture.
      const attachment = this.endAttachmentAt(page, screen, { height: top, snap: false, grid: 0 });
      connect.target = attachment.kind === 'free' ? undefined : attachment;
      connect.exit = sideExit;
      const target = connect.target && page.shapes.find((s) => s.id === connect.target!.shapeId);
      const from = this.anchorPosition(source, sideExit);
      const end =
        connect.target?.kind === 'fixed' && target
          ? this.anchorPosition(target, connect.target.constraint)
          : this.groundPointAtHeight(screen, top);
      connect.loop =
        target?.id === source.id && connect.target?.kind === 'fixed'
          ? this.loopBetween(source, sideExit, connect.target.constraint)
          : undefined;
      const line = connectorPreview(
        [from, ...(connect.loop ?? []), end],
        this.camera.state.zoom,
        this.settings.selection.accentColor,
      );
      line.position.z = top + 0.2;
      this.showConnectionHints(page, connect.target, line);
      return;
    }
    // Boucle sur la forme elle-même : départ stable (point libre du côté le plus proche de son milieu), compté
    // comme pris pour que l'arrivée soit ailleurs.
    const loopExit = this.nearestFreeAnchor(page, source, this.anchorPosition(source, sideExit), connect.side) ?? {
      constraint: sideExit,
      point: this.anchorPosition(source, sideExit),
    };
    const taken = [{ shapeId: source.id, constraint: loopExit.constraint }];
    const attachment = this.endAttachmentAt(page, screen, { taken, height: top, snap: false, grid: 0 });
    connect.target = attachment.kind === 'free' ? undefined : attachment;
    const target = connect.target && page.shapes.find((s) => s.id === connect.target!.shapeId);
    const loop = target?.id === source.id;
    if (loop && connect.target?.kind === 'fixed' && samePoints([connect.target.constraint], [loopExit.constraint]))
      connect.target = { kind: 'floating', shapeId: source.id };
    const aim =
      connect.target?.kind === 'fixed' && target
        ? this.anchorPosition(target, connect.target.constraint)
        : target
          ? { x: target.bounds.x + target.bounds.width / 2, y: target.bounds.y + target.bounds.height / 2 }
          : this.groundPointAtHeight(screen, top);
    // Départ : point libre du côté de la poignée le plus proche de la cible visée.
    const exit = loop
      ? loopExit
      : (this.nearestFreeAnchor(page, source, aim, connect.side) ?? {
          constraint: sideExit,
          point: this.anchorPosition(source, sideExit),
        });
    connect.exit = exit.constraint;
    // Arrivée lâchée dans la forme : point libre de la cible le plus proche du départ.
    const entry =
      connect.target?.kind === 'floating' &&
      target &&
      this.nearestFreeAnchor(page, target, exit.point, undefined, loop ? taken : []);
    if (entry && target) connect.target = { kind: 'fixed', shapeId: target.id, constraint: entry.constraint };
    const end = entry ? entry.point : aim;
    connect.loop =
      loop && connect.target?.kind === 'fixed'
        ? this.loopBetween(source, exit.constraint, connect.target.constraint)
        : undefined;
    const path = [exit.point, ...(connect.loop ?? []), end];
    const line = connectorPreview(path, this.camera.state.zoom, this.settings.selection.accentColor);
    line.position.z = top + 0.2;
    this.showConnectionHints(page, connect.target, line, undefined, taken);
  }

  /** Bout de flèche suivant le pointeur : tracé recalculé en direct, repères sur la forme visée. */
  /** Poignée entre les bouts suivant le pointeur (aimanté à la grille) : points recalculés, tracé en direct. */
  dragEdgePoints(page: PageModel, drag: EdgePointsDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.file.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const raw = this.groundPointAtHeight(screen, this.sceneView.elementTop(edge.id));
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

  dragEdgeEnd(page: PageModel, drag: EdgeEndDrag, screen: Point, snap: boolean): void {
    const edge = page.edges.find((e) => e.id === drag.edgeId);
    const pageTree = this.file.pageTreeOf(page.id);
    if (!edge || !pageTree) return;
    drag.started = true;
    const skip = { edgeId: edge.id, end: drag.end, origin: drag.origin };
    const attachment = this.endAttachmentAt(page, screen, {
      skip,
      height: this.sceneView.elementTop(edge.id),
      snap,
      grid: gridSizeOf(pageTree),
    });
    this.showConnectionHints(page, attachment, undefined, skip);
    if (sameAttachment(attachment, drag.attachment)) return;
    drag.attachment = attachment;
    restoreEnds(edge, drag.original);
    applyEndAttachment(edge, drag.end, attachment);
    // Bout qui referme une boucle sur la forme : coudes recalculés hors de la forme.
    edge.points = this.loopPoints(page, edge) ?? drag.originalPoints.map((p) => ({ ...p }));
    const squared = this.squaredEndPoints(page, edge, drag.end, attachment);
    if (squared) edge.points = squared;
    this.retraceEdges(page, new Set([edge.id]));
    this.afterLiveEdit();
  }

  clearConnectorPreview(): void {
    if (!this.connectorPreview) return;
    this.connectorPreview.removeFromParent();
    disposeObject(this.connectorPreview);
    this.connectorPreview = undefined;
  }

  /** Fin du glisser : la modification est écrite dans l'arbre XML (seuls les attributs concernés). */
  endMove(): void {
    const drag = this.drag;
    this.drag = undefined;
    this.clearConnectorPreview();
    if (!drag?.started || !this.file.document || !this.file.xmlTree) return;
    const pageTree = this.file.pageTreeOf(drag.pageId);
    if (!pageTree) return;

    if (drag.kind === 'label') {
      if (!drag.placement) return;
      this.edits.recordEdit('Position du texte');
      setLabelPlacement(pageTree, drag.cellId, drag.placement);
      this.file.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'edgePoints') {
      const page = this.pages.pageById(drag.pageId);
      const edge = page?.edges.find((e) => e.id === drag.edgeId);
      if (!page || !edge) return;
      if (!drag.points || samePoints(drag.points, drag.original)) {
        edge.points = drag.original;
        if (this.pages.getCurrentPage()?.id === drag.pageId) this.retraceEdges(page, new Set([edge.id]));
        this.afterLiveEdit();
        return;
      }
      this.edits.recordEdit('Points de la flèche');
      this.writeEdgePoints(page, pageTree, edge, drag.points);
      this.file.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'edgeEnd') {
      const page = this.pages.pageById(drag.pageId);
      const edge = page?.edges.find((e) => e.id === drag.edgeId);
      if (!page || !edge) return;
      const before = endAttachmentOf({ ...edge, ...drag.original }, drag.end);
      const after = drag.attachment;
      if (!after || sameAttachment(after, before)) {
        restoreEnds(edge, drag.original);
        edge.points = drag.originalPoints;
        if (this.pages.getCurrentPage()?.id === drag.pageId) this.retraceEdges(page, new Set([edge.id]));
        this.afterLiveEdit();
        return;
      }
      this.edits.recordEdit('Extrémité de flèche');
      writeEndAttachment(pageTree, page, edge, drag.end, after);
      const loop = this.loopPoints(page, edge);
      if (loop) this.writeEdgePoints(page, pageTree, edge, loop);
      else if (!samePoints(edge.points, drag.originalPoints)) this.writeEdgePoints(page, pageTree, edge, edge.points);
      this.file.documentChanged([drag.pageId]);
      return;
    }

    if (drag.kind === 'connect') {
      if (!drag.target) {
        this.rendering.requestRender();
        return;
      }
      this.edits.recordEdit('Connecteur');
      const line = CONNECTOR_STYLE + EDGE_LINE_KEYS[this.settings.shapes.edgeLineStyle];
      let style = withStyleValue(line, 'fontSize', String(this.settings.shapes.textSize));
      const exit = drag.exit ?? CONNECT_DIRECTIONS[drag.side].exit;
      for (const [key, value] of Object.entries(constraintStyle('source', exit)))
        if (value !== undefined) style = withStyleValue(style, key, value);
      if (drag.target.kind === 'fixed')
        for (const [key, value] of Object.entries(constraintStyle('target', drag.target.constraint)))
          if (value !== undefined) style = withStyleValue(style, key, value);
      const id = addEdgeCell(pageTree, { source: drag.sourceId, target: drag.target.shapeId, style });
      // Flèche créée dans un calque : ses points sont en coordonnées de page.
      if (drag.loop) setEdgePoints(pageTree, id, drag.loop);
      // Le mode de la page reçoit la flèche (ex. ajoutée au flux courant), dans la même étape d'annulation.
      const page = this.pages.pageById(drag.pageId);
      const created = page && this.modes.modeOf(page)?.edgeCreated;
      const fresh =
        created && this.file.xmlTree && documentFromTree(this.file.xmlTree).pages.find((p) => p.id === drag.pageId);
      if (created && fresh) {
        const current = this.getModeCurrent(drag.pageId);
        applyModeEdit(fresh, pageTree, (edit) => created(edit, id, current), modePalette(this.settings.styles));
      }
      this.file.documentChanged([drag.pageId]);
      const edge = this.pages.getCurrentPage()?.edges.find((e) => e.id === id);
      if (edge) this.select({ type: 'edge', element: edge });
      return;
    }

    if (drag.kind === 'move') {
      if (drag.applied.x === 0 && drag.applied.y === 0) return;
      this.edits.recordEdit('Déplacement');
      for (const id of drag.rootIds) moveCell(pageTree, id, drag.applied);
      const page = this.pages.pageById(drag.pageId);
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
        this.file.documentChanged([drag.pageId]);
        return;
      }
    } else {
      const shape = this.pages.pageById(drag.pageId)?.shapes.find((s) => s.id === drag.shapeId);
      if (!shape) return;
      const { origin } = drag;
      const delta = {
        x: shape.bounds.x - origin.x,
        y: shape.bounds.y - origin.y,
        width: shape.bounds.width - origin.width,
        height: shape.bounds.height - origin.height,
      };
      if (Object.values(delta).every((d) => d === 0)) return;
      this.edits.recordEdit('Redimensionnement');
      resizeCell(pageTree, drag.shapeId, delta);
    }
    // Ancrage automatique : la forme a bougé, ses flèches et celles de ses voisines sont réparties à nouveau
    // (même étape d'annulation) ; le modèle est alors relu de l'arbre.
    const moved = this.pages.pageById(drag.pageId);
    const fresh =
      moved && this.anchoringOf(moved) === 'auto' && this.file.xmlTree && documentFromTree(this.file.xmlTree);
    const freshPage = fresh && fresh.pages.find((p) => p.id === drag.pageId);
    if (
      freshPage &&
      this.writeDistribution(freshPage, affectedShapes(this.file.geometry.get(drag.pageId), freshPage))
    ) {
      this.file.documentChanged([drag.pageId]);
      return;
    }
    if (freshPage) this.file.geometry.set(drag.pageId, pageGeometry(freshPage));
    // Scènes de cette page à d'autres niveaux, et vue graphe (miniatures) : à reconstruire.
    this.scenes.invalidate(drag.pageId);
    this.scenes.invalidate(GRAPH_PAGE_ID);
    this.graph.invalidate();
    this.minimap.invalidate();
    this.edits.syncModified();
  }

  translateObjects(set: MoveSet, step: Point): void {
    for (const object of this.scenes.current?.root.children ?? []) {
      const id = object.userData.elementId as string | undefined;
      if (id && (set.shapeIds.has(id) || set.edgeIds.has(id))) {
        object.position.x += step.x;
        object.position.y += step.y;
      }
    }
  }

  /** Après une modification en direct : contour, poignées, voile et mini-carte à jour. */
  afterLiveEdit(): void {
    // Le voile met en valeur des objets précis : il est reconstruit (objets remplacés).
    this.clearVeil();
    this.updateSelectionOutline();
    this.minimap.invalidate();
    this.rendering.requestRender();
  }

  /** Remplace l'objet d'une forme (taille changée), à la même hauteur et dans le même ordre de dessin. */
  rebuildShapeObject(shape: ShapeModel): void {
    const root = this.scenes.current?.root;
    const old = this.sceneView.sceneObject(shape.id);
    if (!root || !old) return;
    const base = old.position.z;
    const height = ((old.userData.top as number | undefined) ?? base) - base;
    const object = createShapeObject(shape, this.registry, this.sceneView.renderContext(), this.scenes.current!.level, {
      base,
      height,
    });
    object.userData.elementId = shape.id;
    this.replaceObject(old, object, root);
  }

  /**
   * Reconstruit les arêtes reliées à des formes modifiées (même ordre de dessin, même hauteur), et les flèches à
   * sauts dessinées au-dessus d'elles ou des flèches `moved` (décalées en bloc, pas retracées) : leurs croisements
   * ont pu changer (ticket 129).
   */
  retraceEdges(page: PageModel, edgeIds: ReadonlySet<string>, moved: ReadonlySet<string> = new Set()): void {
    const root = this.scenes.current?.root;
    if (!root || edgeIds.size + moved.size === 0) return;
    const changed = page.edges.filter((edge) => edgeIds.has(edge.id) || moved.has(edge.id));
    const jumps = this.jumpsOf(page);
    const lowest = Math.min(...changed.map((edge) => edge.z));
    const retraced = page.edges
      .filter(
        (edge) => !moved.has(edge.id) && (edgeIds.has(edge.id) || (edge.z > lowest && jumpStyleOf(edge.style, jumps))),
      )
      .sort((a, b) => a.z - b.z);
    if (retraced.length === 0) return;
    const shapes = new Map(page.shapes.map((shape) => [shape.id, shape]));
    const dressing = this.modes.dressing(page);
    for (const edge of retraced) {
      const old = this.sceneView.sceneObject(edge.id);
      if (!old) continue;
      const object = createEdgeObject(
        edge,
        { source: shapes.get(edge.sourceId ?? ''), target: shapes.get(edge.targetId ?? '') },
        { ...this.sceneView.renderContext(page), raisedJumps: this.scenes.current!.level === 'iso' },
        dressing,
        jumpStyleOf(edge.style, jumps) ? this.routesBelow(page, edge) : [],
      );
      object.position.z = old.position.z;
      object.userData.elementId = edge.id;
      object.userData.top = old.userData.top;
      this.replaceObject(old, object, root);
    }
  }

  /** Tracés affichés des flèches dessinées sous `edge` (pour ses sauts), hors `noJump=1`. */
  routesBelow(page: PageModel, edge: EdgeModel): Point[][] {
    const routes: Point[][] = [];
    for (const other of page.edges) {
      if (other.z >= edge.z || other.style.noJump === '1') continue;
      const object = this.sceneView.sceneObject(other.id);
      if (object) routes.push(edgeRoute(object));
    }
    return routes;
  }

  replaceObject(old: Object3D, object: Object3D, root: Object3D): void {
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
  labelEditBackdrop(
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
  startLabelEdit(request: LabelEditRequest): void {
    this.closeLabelEdit();
    this.labelEditing = this.withAngle(this.withFlip(request));
    this.hideEditedLabel();
    this.updateSelectionOutline();
    this.events.emit('labelEdit', this.labelEditing);
  }

  /**
   * Emprise à l'écran du texte édité : la zone de texte d'une forme (dessus du volume), le milieu d'une
   * flèche, ou le point de son texte de début / fin.
   */
  labelEditScreen(elementId: string, end?: EdgeEnd, labelCellId?: string, flipped = false): Rect | undefined {
    const edge = this.pages.getCurrentPage()?.edges.find((e) => e.id === elementId);
    if (!edge) {
      // Forme : sa zone de texte, celle où le label est dessiné à ce niveau de rendu.
      const shape = this.pages.getCurrentPage()?.shapes.find((s) => s.id === elementId);
      const level = this.scenes.current?.level ?? 'flat';
      return shape
        ? this.screenRectOf(elementId, this.labelEditZone(shape, level), this.sceneView.labelTop(shape))
        : undefined;
    }
    // Flèche : le point où le texte est dessiné (son label, un label enfant, ou un début / fin à créer).
    const route = this.sceneView.sceneObject(elementId)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    const child = labelCellId ? edge.labels.find((l) => l.id === labelCellId) : undefined;
    const placement =
      child?.placement ??
      (end ? edgeTextLayout(route, end, flipped, this.endTextGap()).placement : edge.labelPlacement);
    // Texte du milieu qui suit la flèche : son point le long du trait dessiné (glissement compris).
    const along = !child && !end ? this.followedText(elementId) : undefined;
    const point = along ? alongAnchor(along).point : labelPoint(route, placement);
    const center = this.screenOfPoint(point, this.sceneView.elementTop(elementId));
    return { x: center.x, y: center.y, width: 0, height: 0 };
  }

  /**
   * Cadre de l'éditeur en place d'une forme : sa zone de texte à ce niveau de rendu, réduite des marges propres au
   * style (`spacingLeft`…), comme sur toutes les formes (la BDD sous son ellipse, le process étiqueté hors de sa
   * tranche) ; les marges communes restent à l'intérieur du cadre.
   */
  labelEditZone(shape: ShapeModel, level: SceneLevel): Rect {
    return insetRect(this.registry.textZone(shape, level), labelMargins(shape.style));
  }

  /**
   * Plan du texte d'une forme vue de biais ou tournée : sa zone de texte et ses coins projetés à l'écran,
   * à la hauteur où le label est dessiné. Vue de dessus non tournée : undefined (rectangle `screen`).
   */
  labelEditPlane(elementId: string): LabelEditPlane | undefined {
    const { tilt, rotation, fov } = this.camera.state;
    if (tilt === 0 && rotation === 0 && fov === undefined) return undefined;
    const shape = this.pages.getCurrentPage()?.shapes.find((s) => s.id === elementId);
    if (!shape) return undefined;
    const { x, y, width, height } = this.labelEditZone(shape, this.scenes.current?.level ?? 'flat');
    const top = this.sceneView.labelTop(shape);
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
  relocateLabelEdit(): void {
    const editing = this.labelEditing;
    if (!editing || editing.pageId !== this.pages.currentPageId) return;
    const screen = this.labelEditScreen(editing.elementId, editing.end, editing.labelCellId, editing.flipped);
    if (!screen) return;
    const scale = this.textScale(editing.elementId);
    // La bascule disparaît dès que le texte est placé à la main (glisser de sa poignée).
    const plane = editing.onEdge ? undefined : this.labelEditPlane(editing.elementId);
    const next = this.withAngle(this.withFlip({ ...editing, screen, scale, plane }));
    const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
    const samePlane = JSON.stringify(plane) === JSON.stringify(editing.plane);
    if (
      same(screen, editing.screen) &&
      samePlane &&
      scale === editing.scale &&
      next.flip === editing.flip &&
      next.angle === editing.angle
    )
      return;
    this.labelEditing = next;
    this.events.emit('labelEdit', this.labelEditing);
  }

  closeLabelEdit(): void {
    const editing = this.labelEditing;
    if (!editing) return;
    this.labelEditing = undefined;
    this.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = true));
    this.updateSelectionOutline();
  }

  hideEditedLabel(): void {
    const editing = this.labelEditing;
    if (!editing || editing.pageId !== this.pages.currentPageId) return;
    this.sceneView.labelObjects(editing.styleCellId).forEach((object) => (object.visible = false));
    this.rendering.requestRender();
  }

  /** Pixels écran par pixel de page au niveau d'un élément (taille du texte de l'éditeur en place). */
  textScale(elementId: string): number {
    if (this.camera.state.mode !== '3d') return this.camera.state.zoom;
    const rect = this.screenRectOf(elementId);
    const top = this.sceneView.elementTop(elementId);
    const center = rect
      ? screenToPage(this.camera.state, this.display.viewport, {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        })
      : { x: 0, y: 0 };
    const at = this.screenOfPoint(center, top);
    const dx = this.screenOfPoint({ x: center.x + 10, y: center.y }, top);
    const dy = this.screenOfPoint({ x: center.x, y: center.y + 10 }, top);
    return Math.max(Math.hypot(dx.x - at.x, dx.y - at.y), Math.hypot(dy.x - at.x, dy.y - at.y)) / 10;
  }

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
    this.edits.recordEdit('Format du texte');
    for (const [key, value] of changes) setCellStyleValue(editable.pageTree, cellId, key, value);
    this.file.documentChanged([page.id]);
    const editing = this.labelEditing;
    if (editing?.styleCellId === cellId) {
      const next = { ...style, ...Object.fromEntries(changes) };
      for (const [key, value] of changes) if (value === undefined) delete next[key];
      this.labelEditing = { ...editing, style: next as Record<string, string> };
      this.events.emit('labelEdit', this.labelEditing);
      // Position du texte changée : l'éditeur suit le texte à sa nouvelle place.
      this.relocateLabelEdit();
    }
  }

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
    this.edits.recordEdit('Texte');
    if (html === undefined) setCellLabel(editable.pageTree, elementId, text);
    else setCellRichLabel(editable.pageTree, elementId, html);
    this.file.documentChanged([editable.page.id]);
  }

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
    this.edits.recordEdit(end === 'start' ? 'Texte de début' : 'Texte de fin');
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
    this.file.documentChanged([editable.page.id]);
  }

  setLink(elementId: string, link: LinkModel | undefined): void {
    const editable = this.editablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    const href = link ? formatLink(link) : undefined;
    if (href === (element.link ? formatLink(element.link) : undefined)) return;
    this.edits.recordEdit(link ? 'Lien' : 'Lien retiré');
    setCellLink(editable.pageTree, elementId, href);
    this.file.documentChanged([editable.page.id]);
  }

  setSpatial(elementId: string, key: string, value: number | string | undefined, merge?: string): void {
    const editable = this.editablePage();
    const shape = editable?.page.shapes.find((s) => s.id === elementId);
    if (!editable || !shape || !key.startsWith(SPATIAL_PREFIX)) return;
    const text =
      typeof value === 'string'
        ? value.replaceAll(';', '')
        : value === undefined || !Number.isFinite(value)
          ? undefined
          : formatNumber(Math.max(0, value));
    if (spatialValue(shape, key) === text) return;
    const merged =
      merge !== undefined && this.edits.lastMerge?.key === merge && this.edits.lastMerge.edits === this.edits.editCount;
    if (!merged) this.edits.recordEdit('Attribut spatial');
    this.edits.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.edits.editCount };
    const inObject = shape.attributes[key] !== undefined && shape.style[key] === undefined;
    const written = inObject && setCellObjectAttribute(editable.pageTree, elementId, key, text);
    if (!written) setCellStyleValue(editable.pageTree, elementId, key, text);
    if (merge !== undefined && LIVE_SHAPE_KEYS.has(key)) {
      // Le modèle suit le fichier, la forme seule est redessinée ; les autres rendus de la page (autres niveaux,
      // graphe) seront reconstruits à la demande.
      const values = written ? shape.attributes : shape.style;
      if (text === undefined) delete values[key];
      else values[key] = text;
      this.rebuildShapeObject(shape);
      this.scenes.invalidate(editable.page.id);
      this.graph.invalidate();
      this.scenes.invalidate(GRAPH_PAGE_ID, true);
      this.afterLiveEdit();
      this.edits.syncModified();
      if (this.file.document) this.events.emit('documentChange', this.file.document);
      return;
    }
    this.file.documentChanged([editable.page.id]);
  }

  // -------------------------------------------------------------------------
  // Modes de page (sujet 69)

  getModeRegistry(): PageModeRegistry {
    return this.modes;
  }

  setPageMode(pageId: string, modeId: string | undefined): void {
    const page = this.pages.pageById(pageId);
    const pageTree = this.file.pageTreeOf(pageId);
    if (!this.file.xmlTree || !page || !pageTree?.diagram || !this.editable || this.transition) return;
    if ((this.modes.modeId(page) ?? '') === (modeId ?? '')) return;
    const name = modeId && this.modes.get(modeId)?.name;
    this.edits.recordEdit(name ? `Mode ${name}` : 'Page normale');
    setPageAttribute(pageTree, SPATIAL.mode, modeId);
    this.file.documentChanged([pageId]);
  }

  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    const page = this.pages.pageById(pageId);
    const pageTree = this.file.pageTreeOf(pageId);
    if (!this.file.xmlTree || !page || !pageTree?.diagram || !this.editable || this.transition) return;
    if (pageEffectIds(page).includes(effectId) === enabled) return;
    const name = this.effects.get(effectId)?.name ?? effectId;
    this.edits.recordEdit(enabled ? `Effet ${name}` : `Sans effet ${name}`);
    setPageAttribute(pageTree, SPATIAL.effects, withPageEffect(page, effectId, enabled));
    this.file.documentChanged([pageId], { distribute: false });
  }

  editPageMode(label: string, edit: (edit: ModeEdit) => void): void {
    const editable = this.editablePage();
    if (!editable || !this.file.xmlTree) return;
    const before = writeDrawio(this.file.xmlTree);
    if (!applyModeEdit(editable.page, editable.pageTree, edit, modePalette(this.settings.styles))) return;
    this.edits.undoStack.record(label, before);
    this.file.documentChanged([editable.page.id]);
  }

  setModeProperty(scope: ModeScope, targetId: string | undefined, key: string, value: string | undefined): void {
    const page = this.editablePage()?.page;
    const property = page && this.modes.properties(page, scope).find((p) => p.key === key);
    const target: ModeTarget | undefined =
      scope === 'page'
        ? page
        : scope === 'edge'
          ? page?.edges.find((e) => e.id === targetId)
          : page?.shapes.find((s) => s.id === targetId);
    if (!property || !target) return;
    this.editPageMode(property.label, (edit) => {
      if (property.write) property.write(edit, target, value);
      else if (scope === 'page') edit.setPageAttribute(key, value);
      else edit.setElementAttribute(target.id, key, value);
    });
  }

  getModeCurrent(pageId = this.pages.currentPageId): string | undefined {
    const page = pageId ? this.pages.pageById(pageId) : undefined;
    const current = page && this.modes.modeOf(page)?.current;
    if (!page || !current) return undefined;
    const chosen = this.modeCurrents.get(page.id);
    return chosen !== undefined && current.valid(page, chosen) ? chosen : current.initial(page);
  }

  getModeIndicator(pageId = this.pages.currentPageId): ModeIndicator | undefined {
    const page = pageId ? this.pages.pageById(pageId) : undefined;
    const current = page && this.modes.modeOf(page)?.current;
    const value = this.getModeCurrent(pageId);
    const color = page && value !== undefined ? current?.color?.(page, value) : undefined;
    if (!page || !current || value === undefined || !color) return undefined;
    return {
      value,
      color,
      label: current.label?.(page, value) ?? value,
      values: current.values?.(page) ?? [],
      renamable: current.rename !== undefined && this.editablePage()?.page.id === page.id,
    };
  }

  renameModeCurrent(label: string): void {
    const page = this.editablePage()?.page;
    const rename = page && this.modes.modeOf(page)?.current?.rename;
    const value = page && this.getModeCurrent(page.id);
    const name = label.trim();
    if (!rename || value === undefined || !name) return;
    this.editPageMode('Renommage', (edit) => rename(edit, value, name));
  }

  setModeCurrent(value: string, pageId = this.pages.currentPageId): void {
    const page = pageId ? this.pages.pageById(pageId) : undefined;
    const current = page && this.modes.modeOf(page)?.current;
    if (!page || !current?.valid(page, value) || value === this.getModeCurrent(page.id)) return;
    this.modeCurrents.set(page.id, value);
    this.events.emit('modeCurrentChange', page.id, value);
    this.rendering.requestRender();
  }

  /**
   * Estompe ce qui n'est pas gardé net par le courant du mode de la page courante (`ModeCurrent.focus`, paramètre
   * `shapes.modeDimOpacity`) ; seuls les éléments dont l'état change sont repris. Appelé avant chaque image : suit
   * le courant, les modifications du schéma et les scènes reconstruites.
   */
  applyModeFocus(): void {
    const page = this.pages.getCurrentPage();
    const value = page && this.getModeCurrent(page.id);
    const focus = page && value !== undefined ? this.modes.modeOf(page)?.current?.focus?.(page, value) : undefined;
    const kept = focus && new Set(focus);
    const opacity = this.settings.shapes.modeDimOpacity;
    const scenes = new Set([this.scenes.current, this.levels.levelBlend?.flat, this.levels.levelBlend?.volume]);
    for (const scene of scenes) {
      if (scene && scene.pageId === page?.id) setElementsDim(scene.root, (id) => (kept && !kept.has(id) ? opacity : 1));
    }
  }

  /**
   * Un élément cliqué ou sélectionné seul peut changer le courant du mode (ex. flèche d'un flux) ; vrai s'il l'a
   * changé.
   */
  pickModeCurrent(page: PageModel, element: ModeTarget): boolean {
    const value = this.modes.modeOf(page)?.current?.pick?.(page, element);
    if (value === undefined || value === this.getModeCurrent(page.id)) return false;
    this.modeCurrents.set(page.id, value);
    this.events.emit('modeCurrentChange', page.id, value);
    this.rendering.requestRender();
    return true;
  }

  modeKey(key: string): boolean {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || selection?.pageId !== editable.page.id || selection.items.length !== 1) return false;
    const action = this.modes.modeOf(editable.page)?.keys?.[key];
    const id = selection.picked.element.id;
    const target = [...editable.page.edges, ...editable.page.shapes].find((element) => element.id === id);
    if (!action || !target || !action.applies(editable.page, target)) return false;
    const current = this.getModeCurrent(editable.page.id);
    this.editPageMode(action.label, (edit) => action.run(edit, target, current));
    return true;
  }

  /** Avertissements des modes de page (mode inconnu, données remises en ordre) ajoutés à ceux de la lecture. */
  withModeWarnings(document: DocumentModel): DocumentModel {
    document.warnings.push(...this.modes.warnings(document), ...this.effects.warnings(document));
    return document;
  }

  applyStylePreset(elementIds: string[], preset: StylePreset, known: StylePreset[] = []): void {
    const editable = this.editablePage();
    if (!editable || !this.file.xmlTree) return;
    const shapes = editable.page.shapes.filter((s) => elementIds.includes(s.id));
    const before = writeDrawio(this.file.xmlTree);
    let changed = false;
    for (const shape of shapes) {
      changed = applyStylePreset(editable.pageTree, shape.id, shape.style, preset, known) || changed;
    }
    if (!changed) return;
    this.edits.undoStack.record(shapes.length > 1 ? 'Style des formes' : 'Style', before);
    this.file.documentChanged([editable.page.id]);
  }

  setElementsStyle(
    elementIds: string[],
    patch: Record<string, string | undefined> | ((style: Record<string, string>) => Record<string, string | undefined>),
    label = 'Style',
    merge?: string,
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
    // Réglage en direct (ex. champ tapé au fil des frappes) : une seule étape d'annulation tant que rien
    // d'autre n'a été enregistré entre-temps et que la clé `merge` est la même.
    const merged =
      merge !== undefined && this.edits.lastMerge?.key === merge && this.edits.lastMerge.edits === this.edits.editCount;
    if (!merged) this.edits.recordEdit(label);
    this.edits.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.edits.editCount };
    for (const { id, key, value } of changes) setCellStyleValue(editable.pageTree, id, key, value);
    // Réglage en direct d'une clé qui ne touche que le texte d'une flèche : seule la flèche est redessinée (comme
    // pendant un glisser), sans reconstruire la page (tous ses textes clignoteraient à chaque frappe).
    const edges = new Map(editable.page.edges.map((edge) => [edge.id, edge]));
    if (merge !== undefined && changes.every(({ id, key }) => edges.has(id) && LIVE_EDGE_TEXT_KEYS.has(key))) {
      for (const { id, key, value } of changes) {
        const style = edges.get(id)!.style;
        if (value === undefined) delete style[key];
        else style[key] = value;
      }
      this.retraceEdges(editable.page, new Set(changes.map(({ id }) => id)));
      this.afterLiveEdit();
      this.relocateLabelEdit();
      this.edits.syncModified();
      if (this.file.document) this.events.emit('documentChange', this.file.document);
      return;
    }
    this.file.documentChanged([editable.page.id]);
  }

  reverseEdges(edgeIds: string[]): void {
    const editable = this.editablePage();
    const ids = editable?.page.edges.filter((edge) => edgeIds.includes(edge.id)).map((edge) => edge.id) ?? [];
    if (!editable || ids.length === 0) return;
    this.edits.recordEdit('Inverser');
    for (const id of ids) reverseEdgeCell(editable.pageTree, id);
    this.file.documentChanged([editable.page.id], { distribute: false });
  }

  orderSelection(move: OrderMove): void {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || !selection || selection.pageId !== editable.page.id || !this.file.xmlTree) return;
    const before = writeDrawio(this.file.xmlTree);
    const ids = selection.items.map((item) => item.element.id);
    if (!reorderCells(editable.pageTree, ids, move)) return;
    this.edits.undoStack.record(ORDER_LABELS[move], before);
    this.file.documentChanged([editable.page.id], { distribute: false });
  }

  alignSelection(move: AlignMove, reference: AlignReference): void {
    this.arrangeSelection('Aligner', (items) => alignDeltas(items, move, reference));
  }

  distributeSelection(move: DistributeMove): void {
    this.arrangeSelection('Répartir', (items) => distributeDeltas(items, move));
  }

  /**
   * Déplace chaque forme de la sélection (celle qui bouge vraiment : son groupe, cf. `moveTarget`) du décalage calculé
   * sur leurs cadres, dans l'ordre de sélection. Une forme contenue dans une autre de la sélection suit celle-ci ; une
   * forme verrouillée compte (référence, extrême) mais ne bouge pas.
   */
  arrangeSelection(label: string, deltasOf: (items: AlignItem[]) => Map<string, Point>): void {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    const { page, pageTree } = editable;
    const targets = selection.items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.registry));
    const roots = independentRoots(
      targets.map((shape) => shape.id),
      (id) => collectMoveSet(page, id).shapeIds,
    );
    const items = roots.flatMap((id) => {
      const shape = page.shapes.find((s) => s.id === id);
      return shape ? [{ id, bounds: shape.bounds }] : [];
    });
    const moves = [...deltasOf(items)].filter(([id]) => {
      const shape = page.shapes.find((s) => s.id === id);
      return shape !== undefined && !isLocked(shape) && canMoveCell(pageTree, id);
    });
    if (moves.length === 0) return;
    this.edits.recordEdit(label);
    for (const [id, delta] of moves) moveCell(pageTree, id, delta);
    this.file.documentChanged([page.id]);
  }

  deleteSelection(label = 'Suppression'): void {
    const editable = this.editablePage();
    const selection = this.selection;
    if (!editable || !selection || selection.pageId !== editable.page.id) return;
    this.edits.recordEdit(label);
    removeCellsDeep(
      editable.pageTree,
      selection.items.map((item) => item.element.id),
    );
    // Le mode de la page remet ses données en ordre (ex. rangs resserrés), dans la même étape d'annulation.
    const repair = this.modes.modeOf(editable.page)?.repair;
    const page =
      repair && this.file.xmlTree && documentFromTree(this.file.xmlTree).pages.find((p) => p.id === editable.page.id);
    if (repair && page) applyModeEdit(page, editable.pageTree, repair, modePalette(this.settings.styles));
    this.clearSelection();
    this.file.documentChanged([editable.page.id]);
  }

  copySelection(): string | undefined {
    const xml = this.selectionClipboard();
    if (!xml || !this.selection) return undefined;
    const parents = new Map<string, string>();
    for (const { element } of this.selection.items) if (element.parentId) parents.set(element.id, element.parentId);
    this.clipboard = { xml, fileId: this.file.fileId, pageId: this.selection.pageId, parents, steps: 1 };
    return xml;
  }

  cutSelection(): string | undefined {
    if (!this.editablePage()) return undefined;
    const xml = this.copySelection();
    if (!xml || !this.clipboard) return undefined;
    this.clipboard.steps = 0;
    this.deleteSelection('Couper');
    return xml;
  }

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
    const samePage = clipboard.fileId === this.file.fileId && clipboard.pageId === editable.page.id;
    if (!this.pasteXml(clipboard.xml, delta, 'Coller', samePage ? clipboard.parents : undefined)) return false;
    clipboard.steps++;
    return true;
  }

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
  selectionClipboard(): string | undefined {
    const page = this.pages.getCurrentPage();
    const selection = this.selection;
    if (!page || !selection || selection.pageId !== page.id) return undefined;
    const pageTree = this.file.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return copyCells(
      pageTree,
      selection.items.map((item) => item.element.id),
      {
        origin: (id) => page.shapes.find((s) => s.id === id)?.bounds,
        edgeEnd: (id, end) => {
          const route = this.sceneView.sceneObject(id)?.userData.route as Point[] | undefined;
          return end === 'source' ? route?.[0] : route?.at(-1);
        },
      },
    );
  }

  /** Pas de décalage d'un collage : la grille de la page, sinon le paramètre `edit.pasteOffset`. */
  gridStep(pageTree: PageTree): number {
    return gridSizeOf(pageTree) || this.settings.edit.pasteOffset;
  }

  /** Colle un contenu du presse-papier sur la page courante (une étape d'annulation) et le sélectionne. */
  pasteXml(xml: string, delta: Point, label: string, parents?: Map<string, string>): boolean {
    const editable = this.editablePage();
    const model = readClipboardModel(xml);
    if (!editable || !model) return false;
    this.endMove();
    const { page, pageTree } = editable;
    this.edits.recordEdit(label);
    // Données des modes de page (ex. flux et rang d'une flèche) : la copie ne les reprend pas.
    stripCellKeys(model, this.modes.pasteKeys());
    const ids = pasteCells(pageTree, model, {
      delta,
      parentOf: (id) => {
        const parentId = parents?.get(id);
        const parent = parentId ? page.shapes.find((s) => s.id === parentId) : undefined;
        return parent && pageTree.cells.has(parent.id) ? { id: parent.id, origin: parent.bounds } : undefined;
      },
    });
    this.file.documentChanged([page.id]);
    const current = this.pages.getCurrentPage();
    const items = ids.flatMap((id): PickedElement[] => {
      const shape = current?.shapes.find((s) => s.id === id);
      if (shape) return [{ type: 'shape', element: shape }];
      const edge = current?.edges.find((e) => e.id === id);
      return edge ? [{ type: 'edge', element: edge }] : [];
    });
    this.selectItems(items);
    return true;
  }

  /**
   * Emprise à l'écran d'un élément de la page courante (formes : dessus du volume) ; `area` : une
   * partie de la forme en coordonnées page (sa zone de texte), à la place de ses bornes ; `elevation` :
   * hauteur de cette partie, à la place du dessus du volume.
   */
  screenRectOf(elementId: string, area?: Rect, elevation?: number): Rect | undefined {
    const page = this.pages.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === elementId);
    let corners: Point[];
    if (shape) {
      const { x, y, width, height } = area ?? shape.bounds;
      const top = elevation ?? this.sceneView.elementTop(shape.id);
      corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ].map((p) => this.screenOfPoint(p, top));
    } else {
      const route = this.sceneView.sceneObject(elementId)?.userData.route as Point[] | undefined;
      if (!route?.length) return undefined;
      const middle = route[Math.floor(route.length / 2)]!;
      const center = this.screenOfPoint(middle, this.sceneView.elementTop(elementId));
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
  handleClick(screen: Point, toggle = false, followLink = false): void {
    const picked = this.pickAt(screen);
    if (followLink && picked && isNavigableLink(picked.element.link)) {
      this.followLink(picked.element.id);
      return;
    }
    // Espace + clic hors d'une forme liée : rien (Espace sert au déplacement de la vue, pas à la sélection).
    if (followLink && this.settings.controls.followLinkKey === 'space') return;
    if (toggle) {
      if (picked) this.toggleSelect(picked);
      return;
    }
    // Mode de la page : un clic sur un élément d'un autre courant (ex. flèche d'un autre flux) ne fait que changer
    // de courant ; un second clic le sélectionne.
    const page = this.pages.getCurrentPage();
    if (picked && page && this.pickModeCurrent(page, picked.element)) {
      this.clearSelection();
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
  handleDoubleClick(screen: Point, followLink: boolean): void {
    if (this.doubleClickPointHandle(screen)) return;
    const picked = this.pickAt(screen);
    const text = picked?.type === 'edge' ? this.edgeTextAt(screen) : undefined;
    const follow = followLink || this.graph.isGraphView();
    if (picked && follow && isNavigableLink(picked.element.link)) this.followLink(picked.element.id);
    else if (text) this.editEdgeText(text.edge.id, text.cellId);
    else if (picked?.type === 'edge') {
      // Près d'un bout : texte de début ou de fin ; vers le milieu : label de la flèche.
      const route = this.sceneView.sceneObject(picked.element.id)?.userData.route as Point[] | undefined;
      const point = this.groundPointAtHeight(screen, this.sceneView.elementTop(picked.element.id));
      const end = route ? endAt(positionAlong(route, point)) : undefined;
      if (end) this.editEdgeEndLabel(picked.element.id, end);
      else this.editLabel(picked.element.id);
    } else if (picked) this.editLabel(picked.element.id);
  }

  /**
   * Double-clic sur une poignée de la flèche sélectionnée, comme draw.io : un point intermédiaire est
   * retiré ; le coude d'une flèche en coude bascule entre horizontal et vertical.
   */
  doubleClickPointHandle(screen: Point): boolean {
    const handle = this.pointHandleAt(screen);
    const editable = handle && this.editableEdgeSelection();
    if (!handle || !editable) return false;
    const { page, pageTree, edge } = editable;
    if (handle.kind === 'point') {
      this.edits.recordEdit('Point retiré');
      this.writeEdgePoints(page, pageTree, edge, removePoint(edge.points, handle.index));
      this.file.documentChanged([page.id]);
      return true;
    }
    if (handle.kind === 'elbow') {
      this.edits.recordEdit('Coude basculé');
      setCellStyleValue(pageTree, edge.id, 'elbow', edge.style.elbow === 'vertical' ? 'horizontal' : 'vertical');
      this.file.documentChanged([page.id]);
      return true;
    }
    return false;
  }

  /** Survol : curseur main et infobulle sur les éléments liés ; préchargement optionnel. */
  handleHover(screen: Point | undefined): void {
    const picked = screen ? this.pickAt(screen) : undefined;
    const link = isNavigableLink(picked?.element.link) ? picked?.element.link : undefined;
    const handle = screen ? this.handleAt(screen) : undefined;
    const edgeEnd = screen && !handle ? this.edgeEndAt(screen) : undefined;
    const pointHandle = screen && !handle && !edgeEnd ? this.pointHandleAt(screen) : undefined;
    const bent = pointHandle && this.editableEdgeSelection()?.edge;
    const cursor =
      (handle && isConnectHandle(handle)) || edgeEnd
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

  describeLink(link: LinkModel): string {
    const { followLinkKey: key, followLinkGesture: chosen } = this.settings.controls;
    const click = followLinkGesture(key, chosen) === 'click' ? 'clic' : 'double-clic';
    const gesture = key === 'none' ? click : `${FOLLOW_LINK_KEY_LABELS[key]} + ${click}`;
    if (link.type === 'url') return `${link.href} (${gesture} : ouvrir dans un nouvel onglet)`;
    const name = this.pages.pageById(link.pageId)?.name;
    const action = `${gesture} : aller à « ${name} »`;
    return name ? action.charAt(0).toUpperCase() + action.slice(1) : `Lien vers une page absente (${link.pageId})`;
  }

  /** Point de la page visé par un point écran, sur le plan horizontal à `height` au-dessus du sol. */
  groundPointAtHeight(screen: Point, height: number): Point {
    return screenToPage(this.camera.state, this.display.viewport, screen, height);
  }

  /**
   * Contour de sélection animé (paramètre `selection`) : les tirets défilent lentement tant qu'il y a
   * une sélection ; arrêté sans sélection, si désactivé, ou si les animations sont réduites.
   */
  syncSelectionAnimation(): void {
    const run =
      this.selection !== undefined &&
      this.settings.selection.style === 'outline' &&
      this.settings.selection.animated &&
      !this.config.reducedMotion();
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
  setHeldKeys(held: HeldKeys): void {
    this.heldKeys = held;
    if (this.linkZonesShown !== held.followLink) {
      this.linkZonesShown = held.followLink;
      this.updateLinkZones();
    }
    this.emitModeHint();
  }

  getModeHint(): ModeHint | undefined {
    if (this.heldKeys.followLink) return 'navigation';
    if (this.heldKeys.multiSelect && this.selection) return 'multiSelect';
    return undefined;
  }

  emitModeHint(): void {
    const hint = this.getModeHint();
    if (hint === this.modeHint) return;
    this.modeHint = hint;
    this.events.emit('modeHint', hint);
  }

  /**
   * Zones liées (SPEC §11.1) : chaque forme ou flèche de la page courante qui porte un lien navigable,
   * encadrée tant que la touche pour suivre un lien est maintenue (pas pendant une transition).
   */
  updateLinkZones(): void {
    if (this.linkZonesObject) {
      this.linkZonesObject.removeFromParent();
      disposeObject(this.linkZonesObject);
      this.linkZonesObject = undefined;
    }
    const root = this.scenes.current?.root;
    const page = this.pages.getCurrentPage();
    if (this.linkZonesShown && root && page && !this.transition) {
      const zones = new Group();
      zones.name = 'link-zones';
      for (const element of [...page.shapes, ...page.edges]) {
        const link = element.link;
        // Un lien vers une page absente ne mène nulle part : pas de zone.
        if (!isNavigableLink(link) || (link.type === 'page' && !this.pages.pageById(link.pageId))) continue;
        const bounds = 'bounds' in element ? element.bounds : this.sceneView.drawnBounds(element.id);
        if (!bounds) continue;
        const zone = linkZone(bounds, this.camera.state.zoom, this.settings.selection.accentColor);
        // Posée sur le dessus d'un volume, et toujours visible (pas cachée par les blocs).
        zone.position.z = ((this.sceneView.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
        zone.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
        });
        zones.add(zone);
      }
      root.add(zones);
      this.linkZonesObject = zones;
    }
    this.rendering.requestRender();
  }

  /**
   * Mise en valeur de la sélection (paramètre `selection.style`) : voile d'ombre sur le reste de la
   * page (défaut), ou contour bleu pointillé (éventuellement animé).
   */
  updateSelectionOutline(): void {
    if (this.selectionObject) {
      this.selectionObject.parent?.remove(this.selectionObject);
      disposeObject(this.selectionObject);
      this.selectionObject = undefined;
    }
    const selection = this.selection;
    const root = this.scenes.current?.root;
    const visible = selection && root && selection.pageId === this.pages.currentPageId ? selection : undefined;
    const items = visible?.items ?? [];
    const ids = items.map((item) => item.element.id);

    // Voile : gardé tant que la même sélection est affichée dans la même scène.
    // L'emprise de la page en fait partie : le voile la couvre, et un déplacement peut l'agrandir.
    const pageBounds = this.pages.getCurrentPage()?.bounds;
    const veilKey =
      visible && root && pageBounds && this.settings.selection.style === 'veil'
        ? `${root.uuid}:${ids.join('|')}:${this.settings.selection.veilOpacity}:${this.settings.selection.veilColor}:${Object.values(pageBounds).join(',')}`
        : undefined;
    if (this.veil?.key !== veilKey) {
      this.clearVeil();
      const page = this.pages.getCurrentPage();
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
      edges.length > 0 ? `${veilKey}:${this.camera.state.zoom}:${this.settings.selection.veilPadding}` : undefined;
    if (this.veilHole?.key !== holeKey) {
      this.veilHole?.object.removeFromParent();
      if (this.veilHole) disposeObject(this.veilHole.object);
      this.veilHole = undefined;
      if (holeKey && root) {
        const holes = new Group();
        holes.name = 'selection-veil-holes';
        for (const { element } of edges) {
          const object = this.sceneView.sceneObject(element.id);
          const route = (object?.userData.path ?? object?.userData.route) as Point[] | undefined;
          if (!object || !route || route.length < 2) continue;
          const strokeWidth = parseFloat((element.style.strokeWidth as string | undefined) ?? '1') || 1;
          const width = strokeWidth + (2 * this.settings.selection.veilPadding) / this.camera.state.zoom;
          const hole = createVeilHole(route, object.position.z, width);
          // Flèche déplacée en bloc (au clavier, avec sa forme) : son objet est décalé, pas son tracé.
          hole.position.x = object.position.x;
          hole.position.y = object.position.y;
          holes.add(hole);
        }
        root.add(holes);
        this.veilHole = { key: holeKey, object: holes };
      }
    }

    if (root && items.length > 0 && this.settings.selection.style === 'outline') {
      const outlines = new Group();
      outlines.name = 'selection';
      for (const { type, element } of items) {
        const bounds = type === 'shape' ? element.bounds : this.sceneView.drawnBounds(element.id);
        if (!bounds) continue;
        const outline = selectionOutline(
          bounds,
          this.camera.state.zoom,
          this.selectionPhase,
          this.settings.selection.accentColor,
        );
        // Posé sur le dessus d'un volume, et toujours visible (pas caché par les blocs).
        outline.position.z = ((this.sceneView.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
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
        this.camera.state.zoom,
        handleStyle,
      );
      const context = this.pointsContext(editableEdge.page, edge);
      if (context) this.handlesObject.add(edgePointHandles(pointHandles(context), this.camera.state.zoom, handleStyle));
      this.handlesObject.position.z = this.sceneView.elementTop(edge.id) + 0.3;
      this.handlesObject.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
      });
      root.add(this.handlesObject);
    }
    const editable = visible && root ? this.editableSelection() : undefined;
    if (editable && root) {
      const { shape } = editable;
      this.handlesObject = selectionHandles(shape.bounds, this.camera.state.zoom, {
        resize: this.registry.isResizable(shape),
        connect: true,
        size: this.settings.edit.handleSize,
        accent: this.settings.selection.accentColor,
        layout: this.handleLayout(),
      });
      this.handlesObject.position.z = this.sceneView.elementTop(shape.id) + 0.3;
      this.handlesObject.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
      });
      root.add(this.handlesObject);
    }
    this.rendering.requestRender();
  }

  clearVeil(): void {
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
    cancelAnimationFrame(this.camera.animation);
    cancelAnimationFrame(this.selectionAnimation);
    clearTimeout(this.hoverTimer);
    this.transition?.abort();
    this.display.dispose();
    this.controller.dispose();
    this.config.dispose();
    this.minimap.dispose();
    this.scenes.clear();
    this.text.dispose();
    this.rendering.dispose();
    this.events.clear();
  }

  // -------------------------------------------------------------------------
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

/** Coins (espace page) de chaque texte SDF dessiné sous `object` : une lettre tournée par quadrilatère. */
function drawnGlyphQuads(object: Object3D, toPage: Matrix4): Point[][] {
  const quads: Point[][] = [];
  object.traverse((child) => {
    const info = (child as Object3D & { textRenderInfo?: { blockBounds: [number, number, number, number] } })
      .textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    quads.push(
      (
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
        ] as const
      ).map(([x, y]) => {
        const v = new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage);
        return { x: v.x, y: v.y };
      }),
    );
  });
  return quads;
}

/** Point dans un polygone ou à moins de `margin` de son bord. */
function nearPolygon(polygon: Point[], p: Point, margin: number): boolean {
  return insidePolygon(polygon, p) || distanceToPolyline(p, [...polygon, polygon[0]!]) <= margin;
}

/** Clés de style d'une flèche qui ne changent que le dessin de son texte : réglables en direct sans reconstruire la page. */
const LIVE_EDGE_TEXT_KEYS: ReadonlySet<string> = new Set([SPATIAL.labelFollowShift]);
/** Attributs spatiaux qui ne touchent que le dessin de leur forme : réglés en direct, seule la forme est redessinée. */
const LIVE_SHAPE_KEYS: ReadonlySet<string> = new Set([SPATIAL.tag]);

/** Style draw.io avec une clé ajoutée à la fin si elle n'y est pas déjà (`clé=valeur;`). */
function withStyleValue(style: string, key: string, value: string): string {
  if (style.split(';').some((token) => token.split('=')[0]!.trim() === key && token.includes('='))) return style;
  const base = style.trim() === '' || style.trimEnd().endsWith(';') ? style : `${style};`;
  return `${base}${key}=${value};`;
}
