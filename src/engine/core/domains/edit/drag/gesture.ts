import { gridSizeOf } from '../../../format/cellEdits';
import { documentFromTree } from '../../../format/parse';
import type { PageTree } from '../../../format/xmlTree';
import { snapshotEnds } from '../../../edit/edgeEnds';
import type { EdgeSnapping } from '../../../edit/edgeSnap';
import { canMoveShape, collectMoveSet, moveTarget } from '../../../edit/moveSet';
import { movePlan, resizeBounds } from '../../../edit/movePlan';
import type { ObstaclesOf } from '../../../edit/movePlan';
import { connectSideOf, isConnectHandle } from '../../../edit/handleKinds';
import { screenToPage } from '../../../interaction/cameraProjection';
import { isBlockArrow } from '../../../render/edges/blockArrow';
import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../../../model/types';
import type { PickedElement } from '../../../interaction/pick';
import type { Drag, MoveDrag } from './types';
import type { EngineCore } from '../../EngineCore';
import { byId, shapeOf } from '../../../model/pageIndex';

/** Pointeur suivi : point écran, point de la page visé au sol, aimantation, déplacement libre. */
interface DragPointer {
  screen: Point;
  point: Point;
  snap: boolean;
  free: boolean;
}

/** Suivi et écriture d'un genre de glisser ; `commit` vrai : la géométrie d'une forme a été écrite. */
interface DragKind<D extends Drag> {
  follow(page: PageModel, drag: D, pointer: DragPointer): void;
  commit(drag: D, pageTree: PageTree): boolean | void;
}

/**
 * Glisser d'édition à la souris (SPEC §14.1) : ce que l'appui saisit, le suivi du pointeur et l'écriture au lâcher ;
 * déplacement au clavier.
 */
export class DragGesture {
  /** Glisser d'édition en cours (déplacement, redimensionnement, connecteur). */
  private active: Drag | undefined;

  /** Domaine qui suit et écrit chaque genre de glisser. */
  private readonly kinds: { [K in Drag['kind']]: DragKind<Extract<Drag, { kind: K }>> } = {
    move: {
      follow: (page, drag, p) => this.core.moveDrags.follow(page, drag, p.point, p.snap, p.free),
      commit: (drag, pageTree) => this.core.moveDrags.commit(drag, pageTree),
    },
    resize: {
      follow: (page, drag, p) => this.core.resizeDrags.follow(page, drag, p.point, p.snap, p.free),
      commit: (drag, pageTree) => this.core.resizeDrags.commit(drag, pageTree),
    },
    label: {
      follow: (page, drag, p) => this.core.labelDrags.follow(page, drag, p.screen),
      commit: (drag, pageTree) => this.core.labelDrags.commit(drag, pageTree),
    },
    edgeEnd: {
      follow: (page, drag, p) => this.core.edgeEndDrags.follow(page, drag, p.screen, p.snap),
      commit: (drag, pageTree) => this.core.edgeEndDrags.commit(drag, pageTree),
    },
    edgePoints: {
      follow: (page, drag, p) => this.core.edgePointsDrags.follow(page, drag, p.screen, p.snap),
      commit: (drag, pageTree) => this.core.edgePointsDrags.commit(drag, pageTree),
    },
    part: {
      follow: (page, drag, p) => this.core.partDrags.follow(page, drag, p.screen),
      commit: (drag) => this.core.partDrags.commit(drag),
    },
    connect: {
      follow: (page, drag, p) => this.core.connectDrags.follow(page, drag, p.screen),
      commit: (drag, pageTree) => this.core.connectDrags.commit(drag, pageTree),
    },
  };

  constructor(private readonly core: EngineCore) {}

  /** Glisser en cours (lecture seule pour les autres domaines). */
  get drag(): Drag | undefined {
    return this.active;
  }

  isDragging(): boolean {
    return this.active?.started === true;
  }

  /** Glisser saisi hors du pointeur (ex. texte d'une flèche déplacé pendant son édition). */
  startDrag(drag: Drag): void {
    this.active = drag;
  }

  /** Nouveau document : le glisser en cours est abandonné, sans rien écrire. */
  resetDocument(): void {
    this.active = undefined;
  }

  /**
   * Appui gauche : sur une poignée de la sélection, prépare un redimensionnement ou un connecteur ;
   * sur une forme déplaçable, prépare son déplacement.
   */
  beginMove(screen: Point): boolean {
    const editable = this.core.targets.editablePage();
    if (!editable) return false;
    const { page, pageTree } = editable;
    const start = screenToPage(this.core.camera.state, this.core.display.viewport, screen);
    const grid = gridSizeOf(pageTree);
    const drag =
      this.handleDrag(page, screen, start, grid) ??
      // Partie sélectionnée saisie (ex. champ d'une table RDD, sujet 252) : elle se glisse, pas la forme.
      this.core.partDrags.grab(page, screen) ??
      this.elementDrag(page, pageTree, this.core.picking.pickAt(screen), start, grid);
    if (!drag) return false;
    this.active = drag;
    return true;
  }

  /** Glisser d'une poignée de la sélection : bout ou point d'une flèche, redimensionnement, connecteur. */
  private handleDrag(page: PageModel, screen: Point, start: Point, grid: number): Drag | undefined {
    const end = this.core.edgeHandles.edgeEndAt(screen);
    const selectedEdge = end ? this.core.targets.editableEdgeSelection()?.edge : undefined;
    if (end && selectedEdge) {
      return {
        kind: 'edgeEnd',
        pageId: page.id,
        edgeId: selectedEdge.id,
        end,
        original: snapshotEnds(selectedEdge),
        origin: this.core.anchors.endAnchor(page, selectedEdge, end),
        originalPoints: selectedEdge.points.map((p) => ({ ...p })),
        started: false,
      };
    }

    const pointHandle = this.core.edgeHandles.pointHandleAt(screen);
    const bentEdge = pointHandle ? this.core.targets.editableEdgeSelection()?.edge : undefined;
    const context = bentEdge && this.core.edgeHandles.pointsContext(page, bentEdge);
    if (pointHandle && bentEdge && context) {
      return {
        kind: 'edgePoints',
        pageId: page.id,
        edgeId: bentEdge.id,
        handle: pointHandle,
        context,
        original: bentEdge.points.map((p) => ({ ...p })),
        started: false,
      };
    }

    const handle = this.core.shapeHandles.handleAt(screen);
    const selected = handle ? this.core.targets.editableSelection()?.shape : undefined;
    if (!handle || !selected) return undefined;
    return isConnectHandle(handle)
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
          bounded: resizeBounds(page, selected.id, this.obstaclesOf(page)),
          snapping: this.snappingOf(page, [selected.id], new Set([selected.id])),
          started: false,
        };
  }

  /** Élément saisi qui se déplace : une forme déplaçable, ou une flèche pleine par son corps. */
  private elementDrag(
    page: PageModel,
    pageTree: PageTree,
    picked: PickedElement | undefined,
    start: Point,
    grid: number,
  ): Drag | undefined {
    if (picked?.type === 'shape') return this.shapeDrag(page, pageTree, picked.element, start, grid);
    if (picked?.type === 'edge' && isBlockArrow(picked.element.style))
      return this.blockArrowDrag(page, pageTree, picked.element, start, grid);
    return undefined;
  }

  /**
   * Sélection multiple de la page dont fait partie l'élément saisi (`grabbed`) : elle bouge avec lui ; undefined, il
   * bouge seul.
   */
  private grabbedSelection(
    page: PageModel,
    grabbed: (item: PickedElement) => boolean,
  ): readonly PickedElement[] | undefined {
    const selection = this.core.selection.current;
    const items = selection?.pageId === page.id ? selection.items : [];
    return this.core.selection.isMultiSelection() && items.some(grabbed) ? items : undefined;
  }

  /** Forme déplaçable saisie, avec le reste de la sélection multiple si elle en fait partie. */
  private shapeDrag(
    page: PageModel,
    pageTree: PageTree,
    picked: ShapeModel,
    start: Point,
    grid: number,
  ): Drag | undefined {
    const shape = moveTarget(page, picked, this.core.registry);
    if (!canMoveShape(pageTree, shape)) return undefined;
    // Forme saisie dans une sélection multiple : toutes les formes sélectionnées bougent ensemble
    // (celles qu'on ne peut pas déplacer restent en place).
    const items = this.grabbedSelection(
      page,
      (item) => item.type === 'shape' && moveTarget(page, item.element, this.core.registry).id === shape.id,
    );
    const candidates = items
      ? [shape.id, ...this.movableShapes(page, pageTree, items).map((target) => target.id)]
      : [shape.id];
    const edgeIds = items ? selectedEdgeIds(items) : [];
    return this.moveDrag(page, pageTree, candidates, edgeIds, start, shape.bounds, grid);
  }

  /**
   * Flèche pleine saisie par son corps (sujet 424) : elle se déplace en entier comme une forme, aimantée par sa queue,
   * avec le reste de la sélection multiple si elle en fait partie. Les autres flèches ne se glissent que par leurs bouts.
   */
  private blockArrowDrag(
    page: PageModel,
    pageTree: PageTree,
    arrow: EdgeModel,
    start: Point,
    grid: number,
  ): MoveDrag | undefined {
    const ends = this.core.edgeHandles.edgeEndPoints(arrow.id);
    if (!ends) return undefined;
    const items = this.grabbedSelection(page, (item) => item.type === 'edge' && item.element.id === arrow.id);
    const shapeIds = items ? this.movableShapes(page, pageTree, items).map((shape) => shape.id) : [];
    const edgeIds = items ? selectedEdgeIds(items) : [arrow.id];
    const origin = { ...ends.source, width: 0, height: 0 };
    const drag = this.moveDrag(page, pageTree, shapeIds, edgeIds, start, origin, grid);
    // Flèche verrouillée : rien à déplacer.
    return drag.edges.some((edge) => edge.id === arrow.id) ? drag : undefined;
  }

  /**
   * Déplacement de formes (`shapeIds`, déjà déplaçables) et de flèches ensemble : une forme prise avec son
   * conteneur bouge avec lui ; une flèche dont une forme reste en place en est détachée. Ce que le mode emporte peut
   * être laissé en place, Ctrl maintenu (`other`, sujet 351).
   */
  private moveDrag(
    page: PageModel,
    pageTree: PageTree,
    shapeIds: string[],
    edgeIds: string[],
    start: Point,
    origin: Rect,
    grid: number,
  ): MoveDrag {
    const carried = this.core.pageModes.carried(page, shapeIds, pageTree);
    const obstaclesOf = this.obstaclesOf(page);
    const plan = movePlan(page, pageTree, shapeIds, edgeIds, carried, obstaclesOf);
    const other =
      carried.length > 0 && edgeIds.length === 0 ? movePlan(page, pageTree, shapeIds, [], [], obstaclesOf) : undefined;
    return {
      kind: 'move',
      pageId: page.id,
      ...plan,
      other,
      detached: false,
      start,
      origin: { ...origin },
      applied: { x: 0, y: 0 },
      grid,
      snapping: this.snappingOf(page, plan.rootIds, plan.set.shapeIds),
      // Places du mode (sujet 481) : pour une forme glissée seule, sans rien d'emporté.
      places:
        plan.rootIds.length === 1 &&
        plan.edges.length === 0 &&
        carried.length === 0 &&
        this.core.pageModes.hasDragPlaces(page),
      started: false,
    };
  }

  /**
   * Aimantation bord à bord du mode de la page (sujet 477) pour les formes `shapeIds` : leurs emprises et leurs cibles,
   * hors formes déplacées (`moving`) ; undefined sans cible.
   */
  private snappingOf(
    page: PageModel,
    shapeIds: readonly string[],
    moving: ReadonlySet<string>,
  ): EdgeSnapping | undefined {
    const rects: Rect[] = [];
    const targets = new Map<string, Rect>();
    for (const id of shapeIds) {
      const shape = shapeOf(page, id);
      const list = shape ? this.core.pageModes.snapTargets(page, shape) : [];
      if (!shape || list.length === 0) continue;
      rects.push({ ...shape.bounds });
      for (const target of list) if (!moving.has(target.id)) targets.set(target.id, { ...target.rect });
    }
    return rects.length > 0 && targets.size > 0 ? { moving: rects, targets: [...targets.values()] } : undefined;
  }

  /** Obstacles du mode de la page pour une forme (sujet 241), lus par les plans de déplacement et redimensionnement. */
  private obstaclesOf(page: PageModel): ObstaclesOf {
    return (shape) => this.core.pageModes.obstacles(page, shape);
  }

  /**
   * Formes déplaçables d'une sélection : la forme que chaque élément saisi déplace (`moveTarget`), sauf celles qu'on ne
   * peut pas déplacer (elles restent en place).
   */
  private movableShapes(page: PageModel, pageTree: PageTree, items: readonly PickedElement[]): ShapeModel[] {
    return items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.core.registry))
      .filter((shape) => canMoveShape(pageTree, shape));
  }

  nudgeSelection(direction: Point, coarse: boolean): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || this.active || selection?.pageId !== editable.page.id) return false;
    const { page, pageTree } = editable;
    const shapes = this.movableShapes(page, pageTree, selection.items);
    const edgeIds = selectedEdgeIds(selection.items);
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
    // Un pas au clavier ne s'aimante pas (il ne pourrait pas éloigner la forme d'une autre) ni ne vise de place.
    drag.snapping = undefined;
    drag.places = false;
    const { nudgeStep, nudgeCoarseStep } = this.core.settings.edit;
    const onGrid = coarse && nudgeCoarseStep === 0;
    const step = onGrid ? grid : coarse ? nudgeCoarseStep : nudgeStep;
    this.active = drag;
    const live = this.core.file.livePage(page.id, this);
    if (live) this.core.moveDrags.follow(live, drag, { x: direction.x * step, y: direction.y * step }, onGrid);
    this.endMove();
    return true;
  }

  /**
   * Suit le pointeur, mesuré au sol (projection orthographique, identique à toute hauteur : une
   * forme en volume reste sous le curseur). La copie de travail de la page (sujet 312) et la scène sont mises à jour
   * en place.
   */
  moveTo(screen: Point, snap: boolean, free = false): void {
    const drag = this.active;
    if (!drag || this.core.pages.getCurrentPage()?.id !== drag.pageId) return;
    const page = this.core.file.livePage(drag.pageId, this);
    if (!page) return;
    const point = screenToPage(this.core.camera.state, this.core.display.viewport, screen);
    this.kindOf(drag).follow(page, drag, { screen, point, snap, free });
  }

  /**
   * Fin du glisser : la modification est écrite dans l'arbre XML (seuls les attributs concernés), puis la copie de
   * travail de la page devient la page du document (sujet 312).
   */
  endMove(): void {
    try {
      this.commitMove();
    } finally {
      this.core.file.settleLivePage(this);
    }
  }

  private commitMove(): void {
    const drag = this.active;
    this.active = undefined;
    this.core.preview.clearConnectorPreview();
    this.core.preview.clearLimits();
    this.core.preview.clearPlaces();
    if (!drag?.started || !this.core.file.document || !this.core.file.xmlTree) return;
    const pageTree = this.core.file.pageTreeOf(drag.pageId);
    if (!pageTree) return;
    if (this.kindOf(drag).commit(drag, pageTree) === true) this.afterGeometryEdit(drag.pageId);
  }

  /** Entrée du genre du glisser : TypeScript ne relie pas la clé `kind` au type de l'entrée, d'où la conversion. */
  private kindOf<D extends Drag>(drag: D): DragKind<D> {
    return this.kinds[drag.kind] as unknown as DragKind<D>;
  }

  /**
   * Après un déplacement ou un redimensionnement écrit : en ancrage automatique, les flèches de la forme et de ses
   * voisines sont réparties à nouveau (même étape d'annulation) ; sinon les autres rendus de la page sont à refaire.
   */
  private afterGeometryEdit(pageId: string): void {
    // Relecture de l'arbre seulement en ancrage automatique : la forme a bougé, ses flèches et celles de ses voisines
    // sont réparties à nouveau (même étape d'annulation).
    const moved = this.core.pages.pageById(pageId);
    const fresh =
      moved &&
      this.core.arrangement.distributes(moved) &&
      this.core.file.xmlTree &&
      documentFromTree(this.core.file.xmlTree);
    if (fresh && this.core.arrangement.distributeAfterEdit(fresh, [pageId])) {
      this.core.file.documentChanged([pageId]);
      return;
    }
    const freshPage = fresh && byId(fresh.pages, pageId);
    if (freshPage) this.core.file.updateGeometry(freshPage);
    this.core.live.afterLiveWrite(pageId);
  }
}

/** Flèches d'une sélection (elles bougent avec les formes saisies). */
function selectedEdgeIds(items: readonly PickedElement[]): string[] {
  return items.filter((item) => item.type === 'edge').map((item) => item.element.id);
}
