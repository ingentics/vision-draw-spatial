import { buildNavigationGraph } from '../model/navigationGraph';
import type { GraphNode, NavigationGraph } from '../model/navigationGraph';
import type { DocumentModel, EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';

/**
 * Vue graphe de la documentation (SPEC §12), sous forme d'une **page générée** : chaque page du
 * fichier devient un nœud (cadre portant son nom), chaque lien entre pages une flèche. Comme c'est un
 * `PageModel` ordinaire, rendu, sélection, liens, transitions et mini-carte fonctionnent tels quels.
 * Le contenu des pages n'est jamais dessiné, et la disposition n'utilise que leurs noms et leurs liens
 * (sujet 362) : le coût de la vue ne dépend que du nombre de pages et de liens.
 */

export const GRAPH_PAGE_ID = '__graph__';
export const GRAPH_PAGE_NAME = 'Vue graphe';

/** Disposition des nœuds (paramètres « Vue graphe »). */
export interface GraphLayoutOptions {
  /** Largeur d'un nœud ; sa hauteur est fixe (`NODE_HEIGHT`). */
  cardWidth: number;
  columnGap: number;
  /** Espace vertical entre nœuds (le statut se place au-dessus de chaque nœud). */
  rowGap: number;
  /** Décalage des deux flèches d'un aller-retour, pour qu'elles ne se superposent pas. */
  pairOffset: number;
}

export const DEFAULT_GRAPH_LAYOUT: GraphLayoutOptions = { cardWidth: 260, columnGap: 200, rowGap: 90, pairOffset: 16 };
/** Hauteur d'un nœud : deux lignes du nom en 15 px. Fixe, pour ne pas dépendre des dimensions de la page. */
export const NODE_HEIGHT = 56;
/** Hauteur réservée au statut (« départ », « orpheline »…) au-dessus de chaque nœud. */
export const STATUS_HEIGHT = 20;

/** Couleurs de la vue graphe (#rrggbb) : `start` = couleur d'accent, les autres = paramètres `graph.*Color`. */
export interface GraphColors {
  /** Cadre d'un nœud ordinaire. */
  card: string;
  start: string;
  orphan: string;
  unreachable: string;
  arc: string;
  /** Nom des pages, dans les nœuds. */
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
  /** Cadre du nœud, en coordonnées de la page graphe. */
  bounds: Rect;
  node: GraphNode;
}

export interface GraphLayout {
  graph: NavigationGraph;
  cards: GraphCard[];
}

export const cardId = (pageId: string) => `graph-card:${pageId}`;
export const statusId = (pageId: string) => `graph-status:${pageId}`;

/**
 * Disposition en colonnes : distance (en liens) depuis la première page ; puis une colonne pour
 * les pages inaccessibles, puis une pour les orphelines. Ordre du document dans chaque colonne,
 * colonnes centrées verticalement.
 */
export function layoutGraph(document: DocumentModel, options = DEFAULT_GRAPH_LAYOUT): GraphLayout {
  const { cardWidth, columnGap, rowGap } = options;
  const graph = buildNavigationGraph(document);
  const reachableDepth = Math.max(-1, ...graph.nodes.filter((n) => n.reachable).map((n) => n.depth!));
  const columnOf = (node: GraphNode) =>
    node.reachable ? node.depth! : node.orphan ? reachableDepth + 2 : reachableDepth + 1;

  const columns = new Map<number, GraphNode[]>();
  for (const node of graph.nodes) {
    const column = columnOf(node);
    columns.set(column, [...(columns.get(column) ?? []), node]);
  }
  const cards: GraphCard[] = [];
  const step = STATUS_HEIGHT + NODE_HEIGHT + rowGap;
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((column, i) => {
      const nodes = columns.get(column)!;
      const top = -(nodes.length * step - rowGap) / 2;
      nodes.forEach((node, row) => {
        cards.push({
          pageId: node.pageId,
          bounds: {
            x: i * (cardWidth + columnGap),
            y: top + row * step + STATUS_HEIGHT,
            width: cardWidth,
            height: NODE_HEIGHT,
          },
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
      kind: 'rectangle',
      bounds: card.bounds,
      label: node.name,
      style: {
        rounded: '1',
        absoluteArcSize: '1',
        arcSize: '12',
        fillColor: '#ffffff',
        strokeColor: status?.color ?? colors.card,
        strokeWidth: '2',
        ...(status?.dashed ? { dashed: '1' } : {}),
        fontSize: '15',
        fontStyle: '1',
        fontColor: colors.title,
        whiteSpace: 'wrap',
      },
      link,
      z: z++,
    });
    if (!status) continue;
    shapes.push({
      ...base,
      id: statusId(node.pageId),
      kind: 'text',
      bounds: {
        x: card.bounds.x,
        y: card.bounds.y - STATUS_HEIGHT,
        width: card.bounds.width,
        height: STATUS_HEIGHT - 4,
      },
      label: status.text,
      style: { align: 'left', verticalAlign: 'bottom', fontSize: '12', fontColor: status.color, spacing: '0' },
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

/** Milieu des centres de deux cadres, décalé perpendiculairement (à droite du sens de parcours). */
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
