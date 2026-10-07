import type { DocumentModel } from './types';

/**
 * Graphe de navigation entre pages (SPEC §12), tiré des liens `data:page/id,…` des formes et
 * des arêtes. Ce n'est pas un arbre : les cycles sont possibles.
 */

export interface GraphNode {
  pageId: string;
  name: string;
  /** Rang de la page dans le document. */
  index: number;
  /** Pages atteintes par un lien de cette page (sans doublon, ordre du document). */
  outgoing: string[];
  /** Pages ayant un lien vers cette page. */
  incoming: string[];
  /** Distance (en liens) depuis la première page ; absente si inaccessible. */
  depth?: number;
  /** Aucun lien entrant ni sortant. */
  orphan: boolean;
  /** Atteignable depuis la première page en suivant les liens. */
  reachable: boolean;
}

export interface GraphLink {
  from: string;
  to: string;
  /** Nombre d'éléments de la page `from` qui pointent vers `to`. */
  count: number;
  elementIds: string[];
}

export interface NavigationGraph {
  nodes: GraphNode[];
  links: GraphLink[];
  /** Première page du document : départ du calcul d'accessibilité. */
  startPageId?: string;
}

export function buildNavigationGraph(document: DocumentModel): NavigationGraph {
  const pageIds = new Set(document.pages.map((p) => p.id));
  const links = new Map<string, GraphLink>();

  for (const page of document.pages) {
    for (const element of [...page.shapes, ...page.edges]) {
      const link = element.link;
      // Liens vers soi-même ou vers une page absente : hors graphe (signalés par le parseur).
      if (link?.type !== 'page' || link.pageId === page.id || !pageIds.has(link.pageId)) continue;
      const key = `${page.id}>${link.pageId}`;
      const entry = links.get(key) ?? { from: page.id, to: link.pageId, count: 0, elementIds: [] };
      entry.count++;
      entry.elementIds.push(element.id);
      links.set(key, entry);
    }
  }

  const order = new Map(document.pages.map((p, i) => [p.id, i]));
  const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!;
  const nodes: GraphNode[] = document.pages.map((page, index) => {
    const outgoing = [...links.values()]
      .filter((l) => l.from === page.id)
      .map((l) => l.to)
      .sort(byOrder);
    const incoming = [...links.values()]
      .filter((l) => l.to === page.id)
      .map((l) => l.from)
      .sort(byOrder);
    return {
      pageId: page.id,
      name: page.name,
      index,
      outgoing,
      incoming,
      orphan: outgoing.length === 0 && incoming.length === 0,
      reachable: false,
    };
  });

  // Parcours en largeur depuis la première page : distance et accessibilité.
  const startPageId = document.pages[0]?.id;
  const byId = new Map(nodes.map((n) => [n.pageId, n]));
  if (startPageId) {
    const start = byId.get(startPageId)!;
    start.depth = 0;
    start.reachable = true;
    const queue = [start];
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const next of node.outgoing) {
        const target = byId.get(next)!;
        if (target.reachable) continue;
        target.reachable = true;
        target.depth = node.depth! + 1;
        queue.push(target);
      }
    }
  }

  return { nodes, links: [...links.values()], startPageId };
}
