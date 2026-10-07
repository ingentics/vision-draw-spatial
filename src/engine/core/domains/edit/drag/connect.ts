import { setEdgePoints } from '../../../format/cellEdits';
import { addEdgeCell } from '../../../format/create';
import type { PageTree } from '../../../format/xmlTree';
import { constraintStyle } from '../../../edit/edgeEnds';
import { CONNECT_DIRECTIONS } from '../../../edit/handleKinds';
import type { PageModel, Point } from '../../../model/types';
import { connectorPreview } from '../../../render/handleMeshes';
import type { ConnectDrag } from './types';
import { samePoints, withStyleValue } from '../helpers';
import type { EngineCore } from '../../EngineCore';

/** Style des connecteurs créés (celui de draw.io par défaut) ; le tracé vient du paramètre `shapes.edgeLineStyle`. */
const CONNECTOR_STYLE = 'orthogonalLoop=1;jettySize=auto;html=1;';

/** Clés du tracé d'une flèche : droite (sans routeur), angles droits, coudes arrondis, courbe (orthogonaux). */
const EDGE_LINE_KEYS = {
  straight: 'rounded=0;',
  sharp: 'edgeStyle=orthogonalEdgeStyle;rounded=0;',
  rounded: 'edgeStyle=orthogonalEdgeStyle;rounded=1;',
  curved: 'edgeStyle=orthogonalEdgeStyle;rounded=0;curved=1;',
} as const;

/** Connecteur tiré d'une poignée de forme : départ, cible visée, boucle sur la forme, création de la flèche. */
export class ConnectDrags {
  constructor(private readonly core: EngineCore) {}

  follow(page: PageModel, connect: ConnectDrag, screen: Point): void {
    const source = page.shapes.find((s) => s.id === connect.sourceId);
    if (!source) return;
    connect.started = true;
    const top = this.core.sceneView.elementTop(source.id);
    const sideExit = CONNECT_DIRECTIONS[connect.side].exit;
    // Formes permises par le mode de la page (sujet 265).
    const accepts = this.core.pageModes.endAccepts(page, 'target', source.id);
    if (this.core.arrangement.distributes(page)) {
      // Ancrage automatique : départ et arrivée au milieu des côtés choisis, répartis à l'écriture.
      const attachment = this.core.anchors.endAttachmentAt(page, screen, {
        accepts,
        height: top,
        snap: false,
        grid: 0,
      });
      connect.target = attachment.kind === 'free' ? undefined : attachment;
      connect.exit = sideExit;
      const target = connect.target && page.shapes.find((s) => s.id === connect.target!.shapeId);
      const from = this.core.anchors.anchorPosition(source, sideExit);
      const end =
        connect.target?.kind === 'fixed' && target
          ? this.core.anchors.anchorPosition(target, connect.target.constraint)
          : this.core.picking.groundPointAtHeight(screen, top);
      connect.loop =
        target?.id === source.id && connect.target?.kind === 'fixed'
          ? this.core.anchors.loopBetween(source, sideExit, connect.target.constraint)
          : undefined;
      const line = connectorPreview(
        [from, ...(connect.loop ?? []), end],
        this.core.camera.state.zoom,
        this.core.settings.selection.accentColor,
      );
      line.position.z = top + 0.2;
      this.core.preview.showConnectionHints(page, connect.target, line);
      return;
    }
    // Boucle sur la forme elle-même : départ stable (point libre du côté le plus proche de son milieu), compté
    // comme pris pour que l'arrivée soit ailleurs.
    const loopExit = this.core.anchors.nearestFreeAnchor(
      page,
      source,
      this.core.anchors.anchorPosition(source, sideExit),
      connect.side,
    ) ?? {
      constraint: sideExit,
      point: this.core.anchors.anchorPosition(source, sideExit),
    };
    const taken = [{ shapeId: source.id, constraint: loopExit.constraint }];
    const attachment = this.core.anchors.endAttachmentAt(page, screen, {
      accepts,
      taken,
      height: top,
      snap: false,
      grid: 0,
    });
    connect.target = attachment.kind === 'free' ? undefined : attachment;
    const target = connect.target && page.shapes.find((s) => s.id === connect.target!.shapeId);
    const loop = target?.id === source.id;
    if (loop && connect.target?.kind === 'fixed' && samePoints([connect.target.constraint], [loopExit.constraint]))
      connect.target = { kind: 'floating', shapeId: source.id };
    const aim =
      connect.target?.kind === 'fixed' && target
        ? this.core.anchors.anchorPosition(target, connect.target.constraint)
        : target
          ? { x: target.bounds.x + target.bounds.width / 2, y: target.bounds.y + target.bounds.height / 2 }
          : this.core.picking.groundPointAtHeight(screen, top);
    // Départ : point libre du côté de la poignée le plus proche de la cible visée.
    const exit = loop
      ? loopExit
      : (this.core.anchors.nearestFreeAnchor(page, source, aim, connect.side) ?? {
          constraint: sideExit,
          point: this.core.anchors.anchorPosition(source, sideExit),
        });
    connect.exit = exit.constraint;
    // Arrivée lâchée dans la forme : point libre de la cible le plus proche du départ.
    const entry =
      connect.target?.kind === 'floating' &&
      target &&
      this.core.anchors.nearestFreeAnchor(page, target, exit.point, undefined, loop ? taken : []);
    if (entry && target) connect.target = { kind: 'fixed', shapeId: target.id, constraint: entry.constraint };
    const end = entry ? entry.point : aim;
    connect.loop =
      loop && connect.target?.kind === 'fixed'
        ? this.core.anchors.loopBetween(source, exit.constraint, connect.target.constraint)
        : undefined;
    const path = [exit.point, ...(connect.loop ?? []), end];
    const line = connectorPreview(path, this.core.camera.state.zoom, this.core.settings.selection.accentColor);
    line.position.z = top + 0.2;
    this.core.preview.showConnectionHints(page, connect.target, line, undefined, taken);
  }

  /** Connecteur lâché sur une forme : la flèche est créée (style des paramètres) et sélectionnée. */
  commit(drag: ConnectDrag, pageTree: PageTree): void {
    if (!drag.target) {
      this.core.rendering.requestRender();
      return;
    }
    this.core.edits.recordEdit('Connecteur');
    const line = CONNECTOR_STYLE + EDGE_LINE_KEYS[this.core.settings.shapes.edgeLineStyle];
    let style = withStyleValue(line, 'fontSize', String(this.core.settings.shapes.textSize));
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
    this.core.pageModes.edgeCreated(drag.pageId, id);
    this.core.file.documentChanged([drag.pageId]);
    const edge = this.core.pages.getCurrentPage()?.edges.find((e) => e.id === id);
    if (edge) this.core.selection.select({ type: 'edge', element: edge });
  }
}
