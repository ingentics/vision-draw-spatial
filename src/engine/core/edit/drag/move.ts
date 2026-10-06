import { moveCell, moveEdgeCell, setEdgeTerminal } from '../../../format/edit';
import type { PageTree } from '../../../format/xmlTree';
import { snapDelta, translateMoveSet } from '../../../edit/move';
import type { PageModel, Point } from '../../../model/types';
import type { MoveDrag } from './types';
import type { EngineCore } from '../../EngineCore';

/** Déplacement de formes (et des flèches sélectionnées avec elles). */
export class MoveDrags {
  constructor(private readonly core: EngineCore) {}

  follow(page: PageModel, move: MoveDrag, point: Point, snap: boolean): void {
    if (!move.started) {
      move.started = true;
      // Une forme seule devient la sélection ; une sélection multiple déplacée reste telle quelle.
      const shape = page.shapes.find((s) => s.id === move.set.rootId);
      if (shape && move.rootIds.length === 1 && move.edges.length === 0)
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
    const target = snapDelta(move.origin, raw, snap ? move.grid : 0);
    const step = { x: target.x - move.applied.x, y: target.y - move.applied.y };
    if (step.x === 0 && step.y === 0) return;
    move.applied = target;
    translateMoveSet(page, move.set, step);
    this.core.live.translateObjects(move.set, step);
    this.core.live.retraceEdges(page, move.set.connectedEdgeIds, move.set.edgeIds);
    this.core.live.afterLiveEdit();
  }

  /** Déplacement lâché : géométrie écrite. Vrai s'il reste à répartir les flèches (`afterGeometryEdit`). */
  commit(drag: MoveDrag, pageTree: PageTree): boolean {
    if (drag.applied.x === 0 && drag.applied.y === 0) return false;
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
    // Bouts détachés : le modèle est relu de l'arbre (attributs `source` / `target` retirés).
    if (drag.edges.some((moved) => moved.detach.length > 0)) {
      this.core.file.documentChanged([drag.pageId]);
      return false;
    }
    return true;
  }
}
