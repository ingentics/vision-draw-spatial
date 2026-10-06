import { setCellStyleValue, setPageAttribute } from '../../../format/edit';
import { documentFromTree } from '../../../format/parse';
import type { PageTree } from '../../../format/xmlTree';
import { constraintStyle } from '../../../edit/edgeEnds';
import { arrangeAnchors, arrangementChanges, arrangementConflicts } from '../../../edit/arrange';
import type { Arrangement } from '../../../edit/arrange';
import type { AvoidOptions } from '../../../edit/avoid';
import { nextPlacementVariant } from '../../../edit/variants';
import { affectedShapes, anchorSeedOf, withNeighbours } from '../../../edit/distribute';
import type { Anchoring } from '../../../edit/distribute';
import type { DocumentModel, EdgeModel, PageModel } from '../../../model/types';
import { SPATIAL } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';
import { samePoints } from '../helpers';

/**
 * Ancrage des flèches d'une page (manuel ou automatique) : répartition sur les côtés des formes, autre agencement,
 * variantes de placement.
 */
export class EdgeArrangement {
  constructor(private readonly core: EngineCore) {}

  /**
   * Ancrage automatique : après une édition, les flèches des formes touchées (et de leurs voisines) sont réparties
   * sur leurs côtés, écrit dans l'arbre XML (même étape d'annulation). Vrai si quelque chose a été écrit.
   */
  distributeAfterEdit(after: DocumentModel, changedPageIds: string[]): boolean {
    if (!this.core.targets.editable) return false;
    let wrote = false;
    for (const pageId of changedPageIds) {
      const page = after.pages.find((p) => p.id === pageId);
      if (!page || this.anchoringOf(page) !== 'auto') continue;
      const shapeIds = affectedShapes(this.core.file.geometry.get(pageId), page);
      if (shapeIds.size > 0) wrote = this.writeDistribution(page, shapeIds) || wrote;
    }
    return wrote;
  }

  /** Écrit la répartition des flèches des formes `shapeIds` (et les coudes des boucles concernées). */
  writeDistribution(page: PageModel, shapeIds: ReadonlySet<string>): boolean {
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!pageTree) return false;
    const arrangement = arrangeAnchors(page, shapeIds, { seed: anchorSeedOf(page), route: this.avoidOptions() });
    return this.writeArrangement(page, pageTree, arrangement);
  }

  /** Réglages du tracé automatique ; undefined si le contournement est coupé (`shapes.edgeAutoRoute`). */
  private avoidOptions(): AvoidOptions | undefined {
    const { shapes } = this.core.settings;
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
  private writeArrangement(page: PageModel, pageTree: PageTree, arrangement: Arrangement): boolean {
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
          ? this.core.anchors.loopPoints(page, edge)
          : !routed && edgeIds.has(edge.id)
            ? []
            : undefined);
      if (!points || samePoints(points, edge.points)) continue;
      this.core.edgePoints.writeEdgePoints(page, pageTree, edge, points);
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
  private otherArrangement(): boolean {
    const editable = this.core.targets.editablePage();
    if (!editable || this.anchoringOf(editable.page) !== 'auto' || !this.core.file.xmlTree) return false;
    const { page, pageTree } = editable;
    const picked =
      this.core.selection.current?.pageId === page.id && !this.core.selection.isMultiSelection()
        ? this.core.selection.current.picked
        : undefined;
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
      this.core.edits.recordEdit('Autre agencement');
      setPageAttribute(pageTree, SPATIAL.anchorSeed, String(seed));
      this.writeArrangement(page, pageTree, arrangement);
      // Pas de répartition derrière : elle déborderait de la zone choisie.
      this.core.file.documentChanged([page.id], { distribute: false });
      return true;
    }
    return false;
  }

  placementVariant(): boolean {
    const current = this.core.targets.editablePage()?.page;
    if (current && this.anchoringOf(current) === 'auto') return this.otherArrangement();
    const editable = this.core.targets.editableEdgeSelection();
    if (!editable || this.anchoringOf(editable.page) !== 'manual') return false;
    const { page, pageTree, edge } = editable;
    const variant = nextPlacementVariant(page, edge.id, this.core.settings.shapes.edgeLoopMargin);
    if (!variant) return false;
    this.core.edits.recordEdit('Variante de placement');
    for (const [key, value] of Object.entries({
      ...constraintStyle('source', variant.exit),
      ...constraintStyle('target', variant.entry),
    }))
      setCellStyleValue(pageTree, edge.id, key, value);
    this.core.edgePoints.writeEdgePoints(page, pageTree, edge, variant.points);
    this.core.file.documentChanged([page.id]);
    return true;
  }

  anchoringOf(page: PageModel): Anchoring {
    const own = page.attributes[SPATIAL.anchoring];
    return own === 'manual' || own === 'auto' ? own : this.core.settings.shapes.edgeAnchoring;
  }

  setPageAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    const page = this.core.pages.pageById(pageId);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (
      !this.core.file.xmlTree ||
      !page ||
      !pageTree?.diagram ||
      !this.core.targets.editable ||
      this.core.transitions.active
    )
      return;
    if ((page.attributes[SPATIAL.anchoring] ?? '') === (anchoring ?? '')) return;
    this.core.edits.recordEdit('Ancrage des flèches');
    setPageAttribute(pageTree, SPATIAL.anchoring, anchoring);
    const fresh = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (fresh && this.anchoringOf(fresh) === 'auto')
      this.writeDistribution(fresh, new Set(fresh.shapes.map((s) => s.id)));
    this.core.file.documentChanged([pageId]);
  }
}
