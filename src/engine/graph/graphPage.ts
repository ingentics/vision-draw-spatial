import { buildNavigationGraph } from '../model/graph';
import type { GraphNode, NavigationGraph } from '../model/graph';
import type { DocumentModel, EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import { SPATIAL } from '../spatial';

/**
 * Vue graphe de la documentation (SPEC §12), sous forme d'une **page générée** : chaque page du
 * fichier devient une carte (cadre + titre), chaque lien entre pages une flèche. Comme c'est un
 * `PageModel` ordinaire, rendu, sélection, liens, transitions et mini-carte fonctionnent tels quels.
 * Les miniatures des pages sont posées dans les cartes par la scène du graphe (`graphScene.ts`).
 */

export const GRAPH_PAGE_ID = '__graph__';
export const GRAPH_PAGE_NAME = 'Vue graphe';

/** Disposition des cartes (paramètres « Vue graphe »). */
export interface GraphLayoutOptions {
  /** Largeur d'une carte ; la hauteur suit les proportions de la page. */
  cardWidth: number;
  columnGap: number;
  /** Espace vertical entre cartes (le titre se place au-dessus de chaque carte). */
  rowGap: number;
}

export const DEFAULT_GRAPH_LAYOUT: GraphLayoutOptions = { cardWidth: 260, columnGap: 200, rowGap: 90 };
/** Hauteur d'une carte bornée, en fraction de sa largeur. */
const CARD_MIN_RATIO = 110 / 260;
const CARD_MAX_RATIO = 1;
const TITLE_HEIGHT = 26;
/** Décalage des deux flèches d'un aller-retour, pour qu'elles ne se superposent pas. */
const PAIR_OFFSET = 16;

export const GRAPH_COLORS = {
  card: '#9aa0a6',
  start: '#1a73e8',
  orphan: '#d93025',
  unreachable: '#e37400',
  arc: '#5f6368',
  title: '#202124',
} as const;

export interface GraphCard {
  pageId: string;
  /** Cadre de la carte, en coordonnées de la page graphe. */
  bounds: Rect;
  node: GraphNode;
}

export interface GraphLayout {
  graph: NavigationGraph;
  cards: GraphCard[];
}

export const cardId = (pageId: string) => `graph-card:${pageId}`;
export const titleId = (pageId: string) => `graph-title:${pageId}`;

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
  const pages = new Map(document.pages.map((p) => [p.id, p]));
  const heightOf = (node: GraphNode) => {
    const bounds = pages.get(node.pageId)!.bounds;
    const aspect = bounds.width > 0 && bounds.height > 0 ? bounds.height / bounds.width : 0.6;
    return cardWidth * Math.min(CARD_MAX_RATIO, Math.max(CARD_MIN_RATIO, aspect));
  };

  const cards: GraphCard[] = [];
  [...columns.keys()]
    .sort((a, b) => a - b)
    .forEach((column, i) => {
      const nodes = columns.get(column)!;
      const total = nodes.reduce((sum, n) => sum + heightOf(n) + TITLE_HEIGHT, 0) + rowGap * (nodes.length - 1);
      let y = -total / 2;
      for (const node of nodes) {
        const height = heightOf(node);
        y += TITLE_HEIGHT;
        cards.push({
          pageId: node.pageId,
          bounds: { x: i * (cardWidth + columnGap), y, width: cardWidth, height },
          node,
        });
        y += height + rowGap;
      }
    });
  return { graph, cards };
}

/** Construit la page graphe d'un document. */
export function buildGraphPage(
  document: DocumentModel,
  options = DEFAULT_GRAPH_LAYOUT,
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
        ? { text: 'orpheline', color: GRAPH_COLORS.orphan }
        : { text: 'inaccessible', color: GRAPH_COLORS.unreachable }
      : node.pageId === graph.startPageId
        ? { text: 'départ', color: GRAPH_COLORS.start }
        : undefined;
    const stroke =
      status && status.text !== 'départ'
        ? status.color
        : node.pageId === graph.startPageId
          ? GRAPH_COLORS.start
          : GRAPH_COLORS.card;
    const link = { type: 'page' as const, pageId: node.pageId };

    shapes.push({
      ...base,
      id: cardId(node.pageId),
      kind: 'rectangle',
      bounds: card.bounds,
      label: '',
      // Pas de fond : la miniature de la page se dessine directement sur le fond de la scène.
      style: {
        rounded: '1',
        absoluteArcSize: '1',
        arcSize: '12',
        fillColor: 'none',
        strokeColor: stroke,
        strokeWidth: '2',
        ...(status && status.text !== 'départ' ? { dashed: '1' } : {}),
        [SPATIAL.noLinkBadge]: '1',
      },
      link,
      z: z++,
    });
    shapes.push({
      ...base,
      id: titleId(node.pageId),
      kind: 'text',
      bounds: { x: card.bounds.x, y: card.bounds.y - TITLE_HEIGHT, width: card.bounds.width, height: TITLE_HEIGHT - 4 },
      label: status ? `${node.name}  ·  ${status.text}` : node.name,
      style: {
        align: 'left',
        verticalAlign: 'bottom',
        fontSize: '15',
        fontStyle: '1',
        fontColor: status && status.text !== 'départ' ? status.color : GRAPH_COLORS.title,
        spacing: '0',
        [SPATIAL.noLinkBadge]: '1',
      },
      link,
      z: z++,
    });
  }

  const pairs = new Set(graph.links.map((l) => `${l.from}>${l.to}`));
  for (const link of graph.links) {
    const from = byPage.get(link.from)!;
    const to = byPage.get(link.to)!;
    // Aller-retour : chaque flèche passe par un point décalé de son côté, pour rester distinctes.
    const points = pairs.has(`${link.to}>${link.from}`) ? [offsetMidpoint(from.bounds, to.bounds, PAIR_OFFSET)] : [];
    edges.push({
      ...base,
      id: `graph-link:${link.from}>${link.to}`,
      label: link.count > 1 ? `×${link.count}` : '',
      style: {
        endArrow: 'block',
        endSize: '8',
        strokeColor: GRAPH_COLORS.arc,
        strokeWidth: '2',
        fontColor: GRAPH_COLORS.arc,
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
