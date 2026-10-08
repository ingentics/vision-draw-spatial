import { buildNavigationGraph } from '../model/navigationGraph';
import type { GraphNode, NavigationGraph } from '../model/navigationGraph';
import type { DocumentModel, EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';

/**
 * Vue graphe de la documentation (SPEC §12), sous forme d'une **page générée** : chaque page du
 * fichier devient un nœud (cercle, son nom dessous), chaque lien entre pages une flèche. Comme c'est un
 * `PageModel` ordinaire, rendu, sélection, liens, transitions et mini-carte fonctionnent tels quels.
 * Le contenu des pages n'est jamais dessiné, et la disposition n'utilise que leurs noms et leurs liens
 * (sujet 362) : le coût de la vue ne dépend que du nombre de pages et de liens.
 */

export const GRAPH_PAGE_ID = '__graph__';
export const GRAPH_PAGE_NAME = 'Vue graphe';

/** Disposition des nœuds (paramètres « Vue graphe »). */
export interface GraphLayoutOptions {
  /** Diamètre d'un nœud (cercle). */
  nodeSize: number;
  /** Espace horizontal entre deux nœuds voisins d'une rangée, de bord de nom à bord de nom. */
  nodeGap: number;
  /** Espace vertical entre deux rangées, du bas des noms au haut des statuts. */
  layerGap: number;
  /** Décalage des deux flèches d'un aller-retour, pour qu'elles ne se superposent pas. */
  pairOffset: number;
}

export const DEFAULT_GRAPH_LAYOUT: GraphLayoutOptions = { nodeSize: 64, nodeGap: 50, layerGap: 20, pairOffset: 15 };
/** Hauteur réservée au statut (« départ », « orpheline »…) au-dessus de chaque nœud. */
export const STATUS_HEIGHT = 20;
/** Nom de la page sous le cercle : écart au cercle, largeur fixe, hauteur de deux lignes en 15 px. */
export const LABEL_GAP = 6;
export const LABEL_WIDTH = 160;
export const LABEL_HEIGHT = 40;

/** Couleurs de la vue graphe (#rrggbb) : `start` = couleur d'accent, les autres = paramètres `graph.*Color`. */
export interface GraphColors {
  /** Contour d'un nœud ordinaire. */
  card: string;
  start: string;
  orphan: string;
  unreachable: string;
  arc: string;
  /** Nom des pages, sous les nœuds. */
  title: string;
}

export const GRAPH_COLORS: GraphColors = {
  card: '#9aa0a6',
  start: '#1a73e8',
  orphan: '#d93025',
  unreachable: '#e37400',
  arc: '#5f6368',
  title: '#202124',
} as const;

export interface GraphCard {
  pageId: string;
  /** Carré du cercle du nœud, en coordonnées de la page graphe. */
  bounds: Rect;
  node: GraphNode;
}

export interface GraphLayout {
  graph: NavigationGraph;
  cards: GraphCard[];
}

export const cardId = (pageId: string) => `graph-card:${pageId}`;
export const statusId = (pageId: string) => `graph-status:${pageId}`;
export const nameId = (pageId: string) => `graph-name:${pageId}`;

/**
 * Disposition en rangées, de haut en bas : distance (en liens) depuis la première page ; puis une rangée pour les
 * pages inaccessibles, puis une pour les orphelines. Ordre du document de gauche à droite dans chaque rangée, rangées
 * centrées horizontalement. Chaque nœud occupe une case : statut, cercle, nom.
 */
export function layoutGraph(document: DocumentModel, options = DEFAULT_GRAPH_LAYOUT): GraphLayout {
  const { nodeSize, nodeGap, layerGap } = options;
  const graph = buildNavigationGraph(document);
  const reachableDepth = Math.max(-1, ...graph.nodes.filter((n) => n.reachable).map((n) => n.depth!));
  const rowOf = (node: GraphNode) =>
    node.reachable ? node.depth! : node.orphan ? reachableDepth + 2 : reachableDepth + 1;

  const rows = new Map<number, GraphNode[]>();
  for (const node of graph.nodes) {
    const row = rowOf(node);
    rows.set(row, [...(rows.get(row) ?? []), node]);
  }
  const cards: GraphCard[] = [];
  const stepX = Math.max(nodeSize, LABEL_WIDTH) + nodeGap;
  const stepY = STATUS_HEIGHT + nodeSize + LABEL_GAP + LABEL_HEIGHT + layerGap;
  [...rows.keys()]
    .sort((a, b) => a - b)
    .forEach((row, i) => {
      const nodes = rows.get(row)!;
      nodes.forEach((node, k) => {
        const centerX = (k - (nodes.length - 1) / 2) * stepX;
        cards.push({
          pageId: node.pageId,
          bounds: { x: centerX - nodeSize / 2, y: i * stepY + STATUS_HEIGHT, width: nodeSize, height: nodeSize },
          node,
        });
      });
    });
  return { graph, cards };
}

/** Construit la page graphe d'un document. */
export function buildGraphPage(
  document: DocumentModel,
  options = DEFAULT_GRAPH_LAYOUT,
  colors = GRAPH_COLORS,
): { page: PageModel; layout: GraphLayout } {
  const layout = layoutGraph(document, options);
  const { graph, cards } = layout;
  const byPage = new Map(cards.map((c) => [c.pageId, c]));
  const shapes: ShapeModel[] = [];
  const edges: EdgeModel[] = [];
  // Noms posés après les flèches : une flèche qui descend d'un nœud passe sous son nom.
  const names: ShapeModel[] = [];
  let z = 0;
  const layerId = 'graph';
  const base = { layerId, visible: true, attributes: {}, raw: { styleString: '' } };

  for (const card of cards) {
    const { node } = card;
    const status = !node.reachable
      ? node.orphan
        ? { text: 'orpheline', color: colors.orphan, dashed: true }
        : { text: 'inaccessible', color: colors.unreachable, dashed: true }
      : node.pageId === graph.startPageId
        ? { text: 'départ', color: colors.start, dashed: false }
        : undefined;
    const link = { type: 'page' as const, pageId: node.pageId };

    shapes.push({
      ...base,
      id: cardId(node.pageId),
      kind: 'ellipse',
      bounds: card.bounds,
      label: '',
      style: {
        perimeter: 'ellipsePerimeter',
        fillColor: '#ffffff',
        strokeColor: status?.color ?? colors.card,
        strokeWidth: '2',
        ...(status?.dashed ? { dashed: '1' } : {}),
      },
      link,
      z: z++,
    });
    names.push({
      ...base,
      id: nameId(node.pageId),
      kind: 'text',
      bounds: {
        x: card.bounds.x + (card.bounds.width - LABEL_WIDTH) / 2,
        y: card.bounds.y + card.bounds.height + LABEL_GAP,
        width: LABEL_WIDTH,
        height: LABEL_HEIGHT,
      },
      label: node.name,
      style: {
        align: 'center',
        verticalAlign: 'top',
        fontSize: '15',
        fontStyle: '1',
        fontColor: colors.title,
        whiteSpace: 'wrap',
        spacing: '0',
        labelBackgroundColor: 'default',
      },
      link,
      z: 0,
    });
    if (!status) continue;
    shapes.push({
      ...base,
      id: statusId(node.pageId),
      kind: 'text',
      bounds: {
        x: card.bounds.x + (card.bounds.width - LABEL_WIDTH) / 2,
        y: card.bounds.y - STATUS_HEIGHT,
        width: LABEL_WIDTH,
        height: STATUS_HEIGHT - 4,
      },
      label: status.text,
      style: { align: 'center', verticalAlign: 'bottom', fontSize: '12', fontColor: status.color, spacing: '0' },
      link,
      z: z++,
    });
  }

  const pairs = new Set(graph.links.map((l) => `${l.from}>${l.to}`));
  for (const link of graph.links) {
    const from = byPage.get(link.from)!;
    const to = byPage.get(link.to)!;
    // Aller-retour : chaque flèche passe par un point décalé de son côté, pour rester distinctes.
    const points = pairs.has(`${link.to}>${link.from}`)
      ? [offsetMidpoint(from.bounds, to.bounds, options.pairOffset)]
      : [];
    edges.push({
      ...base,
      id: `graph-link:${link.from}>${link.to}`,
      label: link.count > 1 ? `×${link.count}` : '',
      style: {
        endArrow: 'block',
        endSize: '8',
        strokeColor: colors.arc,
        strokeWidth: '2',
        fontColor: colors.arc,
      },
      sourceId: cardId(link.from),
      targetId: cardId(link.to),
      points,
      labelPlacement: { position: 0, distance: 0, offset: { x: 0, y: 0 } },
      labels: [],
      z: z++,
    });
  }

  for (const name of names) shapes.push({ ...name, z: z++ });

  const page: PageModel = {
    id: GRAPH_PAGE_ID,
    name: GRAPH_PAGE_NAME,
    layers: [{ id: layerId, name: '', visible: true }],
    shapes,
    edges,
    attributes: {},
    bounds: unionBounds(shapes.map((s) => s.bounds)),
  };
  return { page, layout };
}

/** Milieu des centres de deux nœuds, décalé perpendiculairement (à droite du sens de parcours). */
function offsetMidpoint(a: Rect, b: Rect, offset: number): Point {
  const ca = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const cb = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: (ca.x + cb.x) / 2 - (dy / length) * offset, y: (ca.y + cb.y) / 2 + (dx / length) * offset };
}

function unionBounds(rects: Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
