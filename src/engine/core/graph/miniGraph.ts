import { minimapLayout, pageToMinimap } from '../interaction/minimapLayout';
import { center, rectExitPoint, unionOf } from '../model/geometry';
import type { Point, Rect } from '../model/types';
import type { GraphLayout } from './graphPage';

/**
 * Mini-graphe (sujet 366) : la disposition de la vue graphe ramenée à l'encart, à côté de la mini-carte. Même cadrage
 * que la mini-carte (`minimapLayout` : largeur `size`, hauteur selon les proportions, bornée). Sans nom ni statut : à
 * cette échelle ils ne se lisent pas.
 */

export interface MiniGraphNode {
  pageId: string;
  /** Nœud, en pixels de l'encart. */
  rect: Rect;
}

export interface MiniGraphLink {
  /** Bord du nœud de départ et bord du nœud d'arrivée (pointe de la flèche), en pixels de l'encart. */
  from: Point;
  to: Point;
}

export interface MiniGraph {
  width: number;
  height: number;
  nodes: MiniGraphNode[];
  links: MiniGraphLink[];
}

export function miniGraph(layout: GraphLayout, size: number): MiniGraph {
  const bounds = unionOf(layout.cards.map((c) => c.bounds)) ?? { x: 0, y: 0, width: 0, height: 0 };
  const map = minimapLayout(bounds, size);
  const nodes = layout.cards.map((card) => {
    const topLeft = pageToMinimap(map, card.bounds);
    return {
      pageId: card.pageId,
      rect: { ...topLeft, width: card.bounds.width * map.scale, height: card.bounds.height * map.scale },
    };
  });
  const rectOf = new Map(nodes.map((n) => [n.pageId, n.rect]));
  // Un aller-retour se superpose : les deux pointes suffisent à le lire.
  const links = layout.graph.links.map((link) => {
    const from = rectOf.get(link.from)!;
    const to = rectOf.get(link.to)!;
    return { from: rectExitPoint(from, center(to)), to: rectExitPoint(to, center(from)) };
  });
  return { width: map.width, height: map.height, nodes, links };
}
