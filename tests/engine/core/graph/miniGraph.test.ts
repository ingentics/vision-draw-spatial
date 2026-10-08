import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { layoutGraph } from '../../../../src/engine/core/graph/graphPage';
import { miniGraph } from '../../../../src/engine/core/graph/miniGraph';
import { inflate, rectContains, rectContainsRect } from '../../../../src/engine/core/model/geometry';
import { fixture } from '../../../helpers';

const parents = parseDrawio(fixture('parents.drawio'));

describe('miniGraph (sujet 366)', () => {
  const layout = layoutGraph(parents);
  const mini = miniGraph(layout, 200);
  const frame = { x: 0, y: 0, width: mini.width, height: mini.height };

  it('largeur de l’encart, un nœud par page, tous dans l’encart', () => {
    expect(mini.width).toBe(200);
    expect(mini.height).toBeLessThanOrEqual(200);
    expect(mini.nodes.map((n) => n.pageId)).toEqual(layout.cards.map((c) => c.pageId));
    for (const { rect } of mini.nodes) expect(rectContainsRect(frame, rect)).toBe(true);
  });

  it('proportions de la vue graphe gardées', () => {
    const card = layout.cards[0]!.bounds;
    const node = mini.nodes[0]!.rect;
    expect(node.width / node.height).toBeCloseTo(card.width / card.height);
  });

  it('un lien par lien de pages, du bord du nœud de départ au bord du nœud d’arrivée', () => {
    expect(mini.links).toHaveLength(layout.graph.links.length);
    const rectOf = (id: string) => inflate(mini.nodes.find((n) => n.pageId === id)!.rect, 1e-9);
    layout.graph.links.forEach((link, i) => {
      expect(rectContains(rectOf(link.from), mini.links[i]!.from)).toBe(true);
      expect(rectContains(rectOf(link.to), mini.links[i]!.to)).toBe(true);
    });
  });
});
