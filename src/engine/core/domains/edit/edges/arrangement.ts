import { setCellStyleValue, setPageAttribute } from '../../../format/cellEdits';
import { documentFromTree } from '../../../format/parse';
import type { PageTree } from '../../../format/xmlTree';
import { constraintStyle } from '../../../edit/edgeEnds';
import {
  arrangeAnchors,
  arrangementChanges,
  arrangementConflicts,
  straightStyle,
} from '../../../edit/anchoring/auto/anchorArrangement';
import type { Arrangement } from '../../../edit/anchoring/auto/anchorArrangement';
import type { AvoidOptions, Router } from '../../../edit/anchoring/routing';
import { tracingOf } from '../../../edit/anchoring/tracing';
import { nextPlacementVariant } from '../../../edit/anchoring/manual/variants';
import { affectedShapes, anchorSeedOf, resitedEnds, withNeighbours } from '../../../edit/anchoring/auto/distribute';
import { distributes, isAnchoring } from '../../../edit/anchoring/mode';
import type { Anchoring } from '../../../edit/anchoring/mode';
import type { DocumentModel, EdgeModel, PageModel } from '../../../model/types';
import { SPATIAL } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';
import { samePoints } from '../helpers';

/**
 * Ancrage des flèches d'une page (manuel, automatique ou Typon) : répartition sur les côtés des formes, autre agencement,
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
      if (!page || !this.distributes(page)) continue;
      const shapeIds = affectedShapes(this.core.file.geometry.get(pageId), page);
      if (shapeIds.size > 0) wrote = this.writeDistribution(page, shapeIds) || wrote;
    }
    return wrote;
  }

  /**
   * Écrit la répartition des flèches des formes `shapeIds` (et les coudes des boucles concernées). Une forme passée
   * de l'autre côté de sa voisine depuis la dernière écriture (`file.geometry`) y replace ses bouts (`resitedEnds`).
   */
  writeDistribution(page: PageModel, shapeIds: ReadonlySet<string>): boolean {
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!pageTree) return false;
    return this.applyArrangement(page, this.arrangementOf(page, shapeIds), pageTree);
  }

  /**
   * Aperçu pendant le déplacement d'une forme (ticket 177) : les flèches des formes touchées sont réparties et
   * retracées dans le modèle seul (l'arbre XML est écrit au lâcher). Renvoie les flèches à redessiner.
   */
  previewDistribution(page: PageModel): Set<string> {
    if (!this.distributes(page)) return new Set();
    const shapeIds = affectedShapes(this.core.file.geometry.get(page.id), page);
    if (shapeIds.size === 0) return new Set();
    const arrangement = this.arrangementOf(page, shapeIds);
    this.applyArrangement(page, arrangement);
    return new Set([...arrangement.edgeIds, ...arrangement.constraints.map((c) => c.edgeId)]);
  }

  private arrangementOf(page: PageModel, shapeIds: ReadonlySet<string>): Arrangement {
    const resite = resitedEnds(this.core.file.geometry.get(page.id), page);
    return arrangeAnchors(page, shapeIds, { seed: anchorSeedOf(page), resite, ...this.tracing(page) });
  }

  /** Tracé d'une page selon son ancrage (réglages de l'automatique ou du Typon). */
  private tracing(page: PageModel): { route?: AvoidOptions; router?: Router } {
    return tracingOf(this.core.settings.shapes, this.anchoringOf(page));
  }

  /**
   * Applique un agencement (points d'attache, puis tracés) au modèle de la page et, si elle est donnée, à l'arbre XML.
   * Sans tracé automatique, ou sans chemin trouvé, une flèche recalculée perd ses points intermédiaires (tracé de
   * draw.io) ; une boucle sans tracé garde ses coudes par défaut. Vrai si quelque chose a changé.
   */
  private applyArrangement(page: PageModel, arrangement: Arrangement, pageTree?: PageTree): boolean {
    let wrote = false;
    const loops = new Set<EdgeModel>();
    for (const { edgeId, end, constraint } of arrangement.constraints) {
      const edge = page.edges.find((e) => e.id === edgeId);
      if (!edge) continue;
      for (const [key, value] of Object.entries(constraintStyle(end, constraint))) {
        if (pageTree) setCellStyleValue(pageTree, edgeId, key, value);
        if (value === undefined) delete edge.style[key];
        else edge.style[key] = value;
      }
      if (edge.sourceId && edge.sourceId === edge.targetId) loops.add(edge);
      wrote = true;
    }
    const { edgeIds, routes, routed } = arrangement;
    for (const edge of page.edges) {
      const loop = edge.sourceId !== undefined && edge.sourceId === edge.targetId;
      // Flèche à retracer entre deux formes (tracé coupé, ou sans chemin) : ses anciens points n'ont plus cours.
      const retraced = edgeIds.has(edge.id) && (!routed || (!!edge.sourceId && !!edge.targetId));
      const points =
        routes.get(edge.id) ??
        (loops.has(edge) || (loop && retraced) ? this.core.anchors.loopPoints(page, edge) : retraced ? [] : undefined);
      if (arrangement.router.straight && routes.has(edge.id) && edge.style.edgeStyle !== undefined) {
        if (pageTree) setCellStyleValue(pageTree, edge.id, 'edgeStyle', undefined);
        edge.style = straightStyle(edge.style);
        wrote = true;
      }
      if (!points || samePoints(points, edge.points)) continue;
      if (pageTree) this.core.edgePoints.writeEdgePoints(page, pageTree, edge, points);
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
    if (!editable || !this.distributes(editable.page) || !this.core.file.xmlTree) return false;
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
    const tracing = this.tracing(page);
    const base = arrangementConflicts(page, arrangeAnchors(page, shapeIds, { seed: 0, ...tracing }));
    const current = anchorSeedOf(page);
    for (let k = 1; k <= 8; k++) {
      const seed = current + k;
      const arrangement = arrangeAnchors(page, shapeIds, { seed, ...tracing });
      if (!arrangementChanges(page, arrangement) || arrangementConflicts(page, arrangement) > base) continue;
      this.core.edits.recordEdit('Autre agencement');
      setPageAttribute(pageTree, SPATIAL.anchorSeed, String(seed));
      this.applyArrangement(page, arrangement, pageTree);
      // Pas de répartition derrière : elle déborderait de la zone choisie.
      this.core.file.documentChanged([page.id], { distribute: false });
      return true;
    }
    return false;
  }

  placementVariant(): boolean {
    const current = this.core.targets.editablePage()?.page;
    if (current && this.distributes(current)) return this.otherArrangement();
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
    return isAnchoring(own) ? own : this.core.settings.shapes.edgeAnchoring;
  }

  /** Vrai si les flèches de la page sont réparties sur les côtés (ancrage automatique ou Typon). */
  distributes(page: PageModel): boolean {
    return distributes(this.anchoringOf(page));
  }

  setPageAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target) return;
    const { page, pageTree, xmlTree } = target;
    if ((page.attributes[SPATIAL.anchoring] ?? '') === (anchoring ?? '')) return;
    this.core.edits.recordEdit('Ancrage des flèches');
    setPageAttribute(pageTree, SPATIAL.anchoring, anchoring);
    const fresh = documentFromTree(xmlTree).pages.find((p) => p.id === pageId);
    if (fresh && this.distributes(fresh)) this.writeDistribution(fresh, new Set(fresh.shapes.map((s) => s.id)));
    this.core.file.documentChanged([pageId]);
  }
}
