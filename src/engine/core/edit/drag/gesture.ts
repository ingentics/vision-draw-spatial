import { canMoveCell, gridSizeOf } from '../../../format/edit';
import { documentFromTree } from '../../../format/parse';
import type { PageTree } from '../../../format/xmlTree';
import { snapshotEnds } from '../../../edit/edgeEnds';
import { collectMoveSet, isLocked, moveTarget, unionMoveSets } from '../../../edit/move';
import type { MoveSet } from '../../../edit/move';
import { connectSideOf, isConnectHandle } from '../../../edit/handles';
import { affectedShapes, pageGeometry } from '../../../edit/anchoring/auto/distribute';
import { screenToPage } from '../../../interaction/camera';
import { GRAPH_PAGE_ID } from '../../../graph/graphPage';
import { independentRoots } from '../../../interaction/selection';
import type { PageModel, Point, Rect } from '../../../model/types';
import type { Drag, MoveDrag } from './types';
import type { EngineCore } from '../../EngineCore';

/**
 * Glisser d'édition à la souris (SPEC §14.1) : ce que l'appui saisit, le suivi du pointeur et l'écriture au lâcher ;
 * déplacement au clavier.
 */
export class DragGesture {
  /** Glisser d'édition en cours (déplacement, redimensionnement, connecteur). */
  drag: Drag | undefined;

  constructor(private readonly core: EngineCore) {}

  isDragging(): boolean {
    return this.drag?.started === true;
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

    const end = this.core.edgeHandles.edgeEndAt(screen);
    const selectedEdge = end ? this.core.targets.editableEdgeSelection()?.edge : undefined;
    if (end && selectedEdge) {
      this.drag = {
        kind: 'edgeEnd',
        pageId: page.id,
        edgeId: selectedEdge.id,
        end,
        original: snapshotEnds(selectedEdge),
        origin: this.core.anchors.endAnchor(page, selectedEdge, end),
        originalPoints: selectedEdge.points.map((p) => ({ ...p })),
        started: false,
      };
      return true;
    }

    const pointHandle = this.core.edgeHandles.pointHandleAt(screen);
    const bentEdge = pointHandle ? this.core.targets.editableEdgeSelection()?.edge : undefined;
    const context = bentEdge && this.core.edgeHandles.pointsContext(page, bentEdge);
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

    const handle = this.core.shapeHandles.handleAt(screen);
    const selected = handle ? this.core.targets.editableSelection()?.shape : undefined;
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

    const picked = this.core.picking.pickAt(screen);
    if (picked?.type !== 'shape') return false;
    const shape = moveTarget(page, picked.element, this.core.registry);
    if (isLocked(shape) || !canMoveCell(pageTree, shape.id)) return false;
    // Forme saisie dans une sélection multiple : toutes les formes sélectionnées bougent ensemble
    // (celles qu'on ne peut pas déplacer restent en place).
    const selection = this.core.selection.current;
    const grabbedSelected =
      this.core.selection.isMultiSelection() &&
      selection?.pageId === page.id &&
      selection.items.some(
        (item) => item.type === 'shape' && moveTarget(page, item.element, this.core.registry).id === shape.id,
      );
    const candidates = grabbedSelected
      ? [
          shape.id,
          ...selection!.items
            .filter((item) => item.type === 'shape')
            .map((item) => moveTarget(page, item.element, this.core.registry))
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
  private moveDrag(
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
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || this.drag || selection?.pageId !== editable.page.id) return false;
    const { page, pageTree } = editable;
    const shapes = selection.items
      .filter((item) => item.type === 'shape')
      .map((item) => moveTarget(page, item.element, this.core.registry))
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
    const { nudgeStep, nudgeCoarseStep } = this.core.settings.edit;
    const onGrid = coarse && nudgeCoarseStep === 0;
    const step = onGrid ? grid : coarse ? nudgeCoarseStep : nudgeStep;
    this.drag = drag;
    this.core.moveDrags.follow(page, drag, { x: direction.x * step, y: direction.y * step }, onGrid);
    this.endMove();
    return true;
  }

  /**
   * Suit le pointeur, mesuré au sol (projection orthographique, identique à toute hauteur : une
   * forme en volume reste sous le curseur). Modèle et scène sont mis à jour en place.
   */
  moveTo(screen: Point, snap: boolean): void {
    const drag = this.drag;
    const page = this.core.pages.getCurrentPage();
    if (!drag || page?.id !== drag.pageId) return;
    const point = screenToPage(this.core.camera.state, this.core.display.viewport, screen);
    if (drag.kind === 'move') this.core.moveDrags.follow(page, drag, point, snap);
    else if (drag.kind === 'resize') this.core.resizeDrags.follow(page, drag, point, snap);
    else if (drag.kind === 'label') this.core.labelDrags.follow(page, drag, screen);
    else if (drag.kind === 'edgeEnd') this.core.edgeEndDrags.follow(page, drag, screen, snap);
    else if (drag.kind === 'edgePoints') this.core.edgePointsDrags.follow(page, drag, screen, snap);
    else this.core.connectDrags.follow(page, drag, screen);
  }

  /** Fin du glisser : la modification est écrite dans l'arbre XML (seuls les attributs concernés). */
  endMove(): void {
    const drag = this.drag;
    this.drag = undefined;
    this.core.preview.clearConnectorPreview();
    if (!drag?.started || !this.core.file.document || !this.core.file.xmlTree) return;
    const pageTree = this.core.file.pageTreeOf(drag.pageId);
    if (!pageTree) return;
    if (drag.kind === 'label') this.core.labelDrags.commit(drag, pageTree);
    else if (drag.kind === 'edgePoints') this.core.edgePointsDrags.commit(drag, pageTree);
    else if (drag.kind === 'edgeEnd') this.core.edgeEndDrags.commit(drag, pageTree);
    else if (drag.kind === 'connect') this.core.connectDrags.commit(drag, pageTree);
    else if (
      drag.kind === 'move' ? this.core.moveDrags.commit(drag, pageTree) : this.core.resizeDrags.commit(drag, pageTree)
    )
      this.afterGeometryEdit(drag.pageId);
  }

  /**
   * Après un déplacement ou un redimensionnement écrit : en ancrage automatique, les flèches de la forme et de ses
   * voisines sont réparties à nouveau (même étape d'annulation) ; sinon les autres rendus de la page sont à refaire.
   */
  private afterGeometryEdit(pageId: string): void {
    // Ancrage automatique : la forme a bougé, ses flèches et celles de ses voisines sont réparties à nouveau
    // (même étape d'annulation) ; le modèle est alors relu de l'arbre.
    const moved = this.core.pages.pageById(pageId);
    const fresh =
      moved &&
      this.core.arrangement.distributes(moved) &&
      this.core.file.xmlTree &&
      documentFromTree(this.core.file.xmlTree);
    const freshPage = fresh && fresh.pages.find((p) => p.id === pageId);
    if (
      freshPage &&
      this.core.arrangement.writeDistribution(freshPage, affectedShapes(this.core.file.geometry.get(pageId), freshPage))
    ) {
      this.core.file.documentChanged([pageId]);
      return;
    }
    if (freshPage) this.core.file.geometry.set(pageId, pageGeometry(freshPage));
    // Scènes de cette page à d'autres niveaux, et vue graphe (miniatures) : à reconstruire.
    this.core.scenes.invalidate(pageId);
    this.core.scenes.invalidate(GRAPH_PAGE_ID);
    this.core.graph.invalidate();
    this.core.minimap.invalidate();
    this.core.edits.syncModified();
  }
}
