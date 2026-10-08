import { moveCell, moveEdgeCell, setEdgeTerminal } from '../../../format/cellEdits';
import type { PageTree } from '../../../format/xmlTree';
import { moveSetMinus, snapDelta, translateMoveSet } from '../../../edit/moveSet';
import { clampMove } from '../../../edit/obstacles';
import type { PageModel, Point } from '../../../model/types';
import type { MoveDrag, MovePlan } from './types';
import type { EngineCore } from '../../EngineCore';

/** Déplacement de formes (et des flèches sélectionnées avec elles). */
export class MoveDrags {
  constructor(private readonly core: EngineCore) {}

  /**
   * `free` : sans les bornes du mode (Ctrl maintenu, sujet 241), et sans les formes qu'il emporte (sujet 351).
   */
  follow(page: PageModel, move: MoveDrag, point: Point, snap: boolean, free = false): void {
    if (move.other && free !== move.detached) this.switchPlan(page, move);
    if (!move.started) {
      move.started = true;
      // Une forme seule devient la sélection ; une sélection multiple déplacée reste telle quelle.
      const shape = page.shapes.find((s) => s.id === move.set.rootId);
      const grabbed = move.rootIds.filter((id) => !move.carried.has(id));
      if (shape && grabbed.length === 1 && move.edges.every((edge) => move.carried.has(edge.id)))
        this.core.selection.select({ type: 'shape', element: shape });
      // Bouts détachés : libres là où ils sont, avant le premier pas.
      const detached = new Set<string>();
      for (const moved of move.edges) {
        const edge = page.edges.find((e) => e.id === moved.id);
        const ends = this.core.edgeHandles.edgeEndPoints(moved.id);
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
      this.core.live.retraceEdges(page, detached);
    }
    const raw = { x: point.x - move.start.x, y: point.y - move.start.y };
    const snapped = snapDelta(move.origin, raw, snap ? move.grid : 0);
    // Bornes du mode (sujet 241) : arrêt à distance des obstacles, limites montrées en pointillé rouge. Pas à pas depuis
    // la dernière position permise, pour suivre le chemin du geste (on contourne un obstacle par n'importe quel côté).
    let target = snapped;
    if (free) this.core.preview.clearLimits();
    else if (move.bounded) {
      const { applied } = move;
      const here = move.bounded.moving.map((r) => ({ ...r, x: r.x + applied.x, y: r.y + applied.y }));
      const bounded = clampMove(here, move.bounded.obstacles, move.bounded.gap, {
        x: snapped.x - applied.x,
        y: snapped.y - applied.y,
      });
      const { x, y } = bounded.value;
      this.core.preview.showLimits(
        bounded.limits,
        here.map((r) => ({ ...r, x: r.x + x, y: r.y + y })),
      );
      target = { x: applied.x + bounded.value.x, y: applied.y + bounded.value.y };
    }
    const step = { x: target.x - move.applied.x, y: target.y - move.applied.y };
    if (step.x === 0 && step.y === 0) return;
    move.applied = target;
    translateMoveSet(page, move.set, step);
    this.core.live.translateObjects(move.set, step);
    // Ancrage automatique ou Typon : les flèches sont réparties et retracées en direct (modèle seul).
    const arranged = this.core.arrangement.previewDistribution(page);
    if (arranged.size > 0) move.arranged = true;
    this.core.live.retraceEdges(
      page,
      new Set([...move.set.connectedEdgeIds, ...[...arranged].filter((id) => !move.set.edgeIds.has(id))]),
      move.set.edgeIds,
    );
    this.core.live.afterLiveEdit();
  }

  /**
   * Passe à l'autre plan du déplacement (Ctrl pressé ou relâché, sujet 351) : ce qui ne suit plus revient à sa place,
   * ce qui suit de nouveau rejoint le déplacement déjà fait ; leurs flèches sont retracées.
   */
  private switchPlan(page: PageModel, move: MoveDrag): void {
    const current: MovePlan = {
      rootIds: move.rootIds,
      set: move.set,
      edges: move.edges,
      carried: move.carried,
      bounded: move.bounded,
    };
    const next = move.other!;
    Object.assign(move, next, { other: current, detached: !move.detached });
    const { applied } = move;
    if (applied.x === 0 && applied.y === 0) return;
    const left = moveSetMinus(current.set, next.set);
    const joined = moveSetMinus(next.set, current.set);
    const back = { x: -applied.x, y: -applied.y };
    translateMoveSet(page, left, back);
    this.core.live.translateObjects(left, back);
    translateMoveSet(page, joined, applied);
    this.core.live.translateObjects(joined, applied);
    // Flèches qui bougent en bloc avec le nouveau plan : décalées ; les autres touchées : retracées.
    const touched = [left, joined].flatMap((set) => [...set.edgeIds, ...set.connectedEdgeIds]);
    this.core.live.retraceEdges(
      page,
      new Set(touched.filter((id) => !move.set.edgeIds.has(id))),
      new Set(touched.filter((id) => move.set.edgeIds.has(id))),
    );
    this.core.live.afterLiveEdit();
  }

  /** Déplacement lâché : géométrie écrite. Vrai s'il reste à répartir les flèches (`afterGeometryEdit`). */
  commit(drag: MoveDrag, pageTree: PageTree): boolean {
    if (drag.applied.x === 0 && drag.applied.y === 0) {
      // Revenue à sa place : l'aperçu des flèches est oublié, le modèle relu de l'arbre.
      if (drag.arranged) this.core.file.documentChanged([drag.pageId], { distribute: false });
      return false;
    }
    this.core.edits.recordEdit('Déplacement');
    for (const id of drag.rootIds) moveCell(pageTree, id, drag.applied);
    const page = this.core.pages.pageById(drag.pageId);
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
    // Le mode de la page remet en ordre autour des formes posées (ex. région agrandie), même étape d'annulation.
    const placed = this.core.pageModes.shapesPlaced(
      drag.pageId,
      drag.rootIds.filter((id) => !drag.carried.has(id)),
      (shape) =>
        drag.set.shapeIds.has(shape.id)
          ? { ...shape.bounds, x: shape.bounds.x - drag.applied.x, y: shape.bounds.y - drag.applied.y }
          : undefined,
    );
    // Bouts détachés ou mode : le modèle est relu de l'arbre (attributs `source` / `target` retirés).
    if (placed || drag.edges.some((moved) => moved.detach.length > 0)) {
      this.core.file.documentChanged([drag.pageId]);
      return false;
    }
    return true;
  }
}
