import { setCellStyleValue, setPageAttribute } from '../../../format/cellEdits';
import { documentFromTree } from '../../../format/parse';
import type { PageTree } from '../../../format/xmlTree';
import { constraintStyle } from '../../../edit/edgeEnds';
import {
  arrangeAnchors,
  arrangementChanges,
  arrangementConflicts,
  routerStyleChanges,
  withStyleChanges,
} from '../../../edit/anchoring/auto/anchorArrangement';
import type { Arrangement } from '../../../edit/anchoring/auto/anchorArrangement';
import type { AvoidOptions, Router } from '../../../edit/anchoring/routing';
import { tracingOf } from '../../../edit/anchoring/tracing';
import { nextPlacementVariant } from '../../../edit/anchoring/manual/variants';
import { affectedShapes, anchorSeedOf, resitedEnds, withNeighbours } from '../../../edit/anchoring/auto/distribute';
import { distributes, pageAnchoring, pageEdgeLine } from '../../../edit/anchoring/mode';
import type { Anchoring, EdgeLine } from '../../../edit/anchoring/mode';
import type { DocumentModel, EdgeModel, PageModel } from '../../../model/types';
import { SPATIAL } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';
import { byId, edgeOf } from '../../../model/pageIndex';
import { samePoints } from '../../../model/geometry';

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
    if (!this.core.targets.isEditable()) return false;
    let wrote = false;
    for (const pageId of changedPageIds) {
      const page = byId(after.pages, pageId);
      if (!page || !this.distributes(page)) continue;
      const shapeIds = affectedShapes(this.core.file.savedGeometry(pageId), page);
      if (shapeIds.size > 0) wrote = this.writeDistribution(page, shapeIds) || wrote;
    }
    return wrote;
  }

  /**
   * Écrit la répartition des flèches des formes `shapeIds` (et les coudes des boucles concernées). Une forme passée
   * de l'autre côté de sa voisine depuis la dernière écriture (`file.savedGeometry`) y replace ses bouts
   * (`resitedEnds`).
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
    const shapeIds = affectedShapes(this.core.file.savedGeometry(page.id), page);
    if (shapeIds.size === 0) return new Set();
    const arrangement = this.arrangementOf(page, shapeIds);
    this.applyArrangement(page, arrangement);
    return new Set([...arrangement.edgeIds, ...arrangement.constraints.map((c) => c.edgeId)]);
  }

  private arrangementOf(page: PageModel, shapeIds: ReadonlySet<string>): Arrangement {
    const resite = resitedEnds(this.core.file.savedGeometry(page.id), page);
    return arrangeAnchors(page, shapeIds, { seed: anchorSeedOf(page), resite, ...this.tracing(page) });
  }

  /**
   * Tracé d'une page selon son ancrage (réglages de l'automatique ou du Typon), et bouts que son mode place lui-même
   * (sujet 338).
   */
  private tracing(page: PageModel): { route?: AvoidOptions; router?: Router; kept: ReadonlySet<string> } {
    return {
      ...tracingOf(this.core.settings.shapes, this.anchoringOf(page), this.edgeLineOf(page)),
      kept: this.core.pageModes.placedEntries(page),
    };
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
      const edge = edgeOf(page, edgeId);
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
      const changes = edgeIds.has(edge.id) ? routerStyleChanges(edge, arrangement.router) : {};
      if (Object.keys(changes).length > 0) {
        if (pageTree)
          for (const [key, value] of Object.entries(changes)) setCellStyleValue(pageTree, edge.id, key, value);
        edge.style = withStyleChanges(edge.style, changes);
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
      // Sur la copie de travail (sujet 312) : le modèle du document n'est pas modifié, il est relu juste après.
      this.applyArrangement(this.core.file.livePage(page.id, this) ?? page, arrangement, pageTree);
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
    return pageAnchoring(page, this.core.settings.shapes.edgeAnchoring);
  }

  /** Tracé des flèches créées sur la page : le sien, sinon celui de l'appli, s'il est permis par son ancrage. */
  edgeLineOf(page: PageModel): EdgeLine {
    return pageEdgeLine(page, this.anchoringOf(page), this.core.settings.shapes.edgeLineStyle);
  }

  /** Vrai si les flèches de la page sont réparties sur les côtés (ancrage automatique ou Typon). */
  distributes(page: PageModel): boolean {
    return distributes(this.anchoringOf(page));
  }

  setPageAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    const page = this.core.targets.editablePageById(pageId)?.page;
    if (!page || (page.attributes[SPATIAL.anchoring] ?? '') === (anchoring ?? '')) return;
    this.core.edits.recordEdit('Ancrage des flèches');
    this.writePageArrangement(pageId, { anchoring });
    this.core.file.documentChanged([pageId]);
  }

  /**
   * Tracé propre à une page (undefined : celui de l'appli), pour les flèches qui y seront créées ; si l'ancrage les
   * répartit, toutes ses flèches sont redessinées avec lui (sujet 456).
   */
  setPageEdgeLine(pageId: string, line: EdgeLine | undefined): void {
    const page = this.core.targets.editablePageById(pageId)?.page;
    if (!page || (page.attributes[SPATIAL.edgeLine] ?? '') === (line ?? '')) return;
    this.core.edits.recordEdit('Tracé des flèches');
    this.writePageArrangement(pageId, { edgeLine: line });
    this.core.file.documentChanged([pageId], { distribute: false });
  }

  /**
   * Ancrage et tracé propres de la page (une clé absente : inchangé), écrits dans l'étape en cours, sans l'ouvrir ni
   * notifier : un ancrage ou un tracé changé répartit les flèches déjà là si l'ancrage répartit (sujet 456). Panneau de
   * la page, réglages posés par un mode à son arrivée (sujet 442).
   */
  writePageArrangement(
    pageId: string,
    changes: { anchoring?: Anchoring | undefined; edgeLine?: EdgeLine | undefined },
  ): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target) return;
    const { page, pageTree, xmlTree } = target;
    const changed = (key: 'anchoring' | 'edgeLine') =>
      key in changes && (page.attributes[SPATIAL[key]] ?? '') !== (changes[key] ?? '');
    const [anchoringChanged, lineChanged] = [changed('anchoring'), changed('edgeLine')];
    if (lineChanged) setPageAttribute(pageTree, SPATIAL.edgeLine, changes.edgeLine);
    if (anchoringChanged) setPageAttribute(pageTree, SPATIAL.anchoring, changes.anchoring);
    if (!anchoringChanged && !lineChanged) return;
    const fresh = byId(documentFromTree(xmlTree).pages, pageId);
    if (fresh && this.distributes(fresh)) this.writeDistribution(fresh, new Set(fresh.shapes.map((s) => s.id)));
  }
}
