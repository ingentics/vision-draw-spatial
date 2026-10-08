import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import {
  DEFAULT_GRAPH_LAYOUT,
  GRAPH_COLORS,
  GRAPH_PAGE_ID,
  buildGraphPage,
  cardId,
  layoutGraph,
  NODE_HEIGHT,
  statusId,
} from '../../../../src/engine/core/graph/graphPage';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import { buildNavigationGraph } from '../../../../src/engine/core/model/navigationGraph';
import { fixture } from '../../../helpers';
import { createDefaultRegistry } from '../../../../src/engine/plugins';

const parents = parseDrawio(fixture('parents.drawio'));
const links = parseDrawio(fixture('links.drawio'));

describe('buildNavigationGraph', () => {
  const graph = buildNavigationGraph(parents);
  const node = (id: string) => graph.nodes.find((n) => n.pageId === id)!;

  it('liens entre pages (formes et arêtes), comptés, sans boucle sur soi', () => {
    expect(graph.links).toEqual([
      { from: 'home', to: 'detail', count: 1, elementIds: ['home-to-detail'] },
      { from: 'archi', to: 'detail', count: 2, elementIds: ['archi-to-detail', 'archi-edge-to-detail'] },
    ]);
  });

  it('accessibilité depuis la première page, distance, orphelines', () => {
    expect(graph.startPageId).toBe('home');
    expect(node('home')).toMatchObject({ reachable: true, depth: 0, orphan: false });
    expect(node('detail')).toMatchObject({ reachable: true, depth: 1, incoming: ['home', 'archi'] });
    expect(node('archi')).toMatchObject({ reachable: false, orphan: false, outgoing: ['detail'] });
    expect(node('orphan')).toMatchObject({ reachable: false, orphan: true });
  });

  it('cycles : chaque page n’est visitée qu’une fois', () => {
    const g = buildNavigationGraph(links);
    expect(g.nodes.map((n) => [n.pageId, n.depth])).toEqual([
      ['home', 0],
      ['detail', 1],
    ]);
  });
});

describe('layoutGraph', () => {
  it('colonnes : distance depuis le départ, puis inaccessibles, puis orphelines', () => {
    const { cards } = layoutGraph(parents);
    const columnX = (id: string) => cards.find((c) => c.pageId === id)!.bounds.x;
    expect(columnX('home')).toBeLessThan(columnX('detail'));
    expect(columnX('detail')).toBeLessThan(columnX('archi'));
    expect(columnX('archi')).toBeLessThan(columnX('orphan'));
  });

  it('les nœuds ne se chevauchent pas', () => {
    const { cards } = layoutGraph(parents);
    for (const a of cards) {
      for (const b of cards) {
        if (a === b) continue;
        const overlap =
          a.bounds.x < b.bounds.x + b.bounds.width &&
          b.bounds.x < a.bounds.x + a.bounds.width &&
          a.bounds.y < b.bounds.y + b.bounds.height &&
          b.bounds.y < a.bounds.y + a.bounds.height;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('buildGraphPage', () => {
  const { page } = buildGraphPage(parents);

  it('une page générée : un nœud par page portant son nom, lien vers la page', () => {
    expect(page.id).toBe(GRAPH_PAGE_ID);
    expect(page.shapes.filter((s) => s.id.startsWith('graph-card:'))).toHaveLength(4);
    const card = page.shapes.find((s) => s.id === cardId('detail'))!;
    expect(card.link).toEqual({ type: 'page', pageId: 'detail' });
    expect(card.label).toBe('Détail');
  });

  it('nœuds de taille fixe, quelles que soient les dimensions des pages', () => {
    const { cards } = layoutGraph(parents);
    expect(new Set(cards.map((c) => `${c.bounds.width}×${c.bounds.height}`))).toEqual(
      new Set([`${DEFAULT_GRAPH_LAYOUT.cardWidth}×${NODE_HEIGHT}`]),
    );
  });

  it('statuts visibles au-dessus du nœud : départ, inaccessible, orpheline ; rien pour une page ordinaire', () => {
    const status = (id: string) => page.shapes.find((s) => s.id === statusId(id))?.label;
    expect(status('home')).toBe('départ');
    expect(status('archi')).toBe('inaccessible');
    expect(status('orphan')).toBe('orpheline');
    expect(status('detail')).toBeUndefined();
    expect(page.shapes.find((s) => s.id === cardId('orphan'))!.style.dashed).toBe('1');
    expect(page.shapes.find((s) => s.id === cardId('home'))!.style.dashed).toBeUndefined();
  });

  it('couleurs fournies : départ, orpheline, arcs, noms', () => {
    const colors = { ...GRAPH_COLORS, start: '#00aa00', orphan: '#123456', arc: '#abcdef', title: '#111111' };
    const { page: colored } = buildGraphPage(parents, DEFAULT_GRAPH_LAYOUT, colors);
    expect(colored.shapes.find((s) => s.id === cardId('home'))!.style.strokeColor).toBe('#00aa00');
    expect(colored.shapes.find((s) => s.id === statusId('orphan'))!.style.fontColor).toBe('#123456');
    expect(colored.shapes.find((s) => s.id === cardId('orphan'))!.style.fontColor).toBe('#111111');
    expect(colored.edges[0]!.style.strokeColor).toBe('#abcdef');
  });

  it('flèches entre nœuds, nombre de liens si plusieurs', () => {
    const arc = page.edges.find((e) => e.id === 'graph-link:archi>detail')!;
    expect(arc).toMatchObject({ sourceId: cardId('archi'), targetId: cardId('detail'), label: '×2' });
  });

  it('aller-retour : deux flèches décalées de part et d’autre', () => {
    const { page: linksGraph } = buildGraphPage(links);
    const go = linksGraph.edges.find((e) => e.id === 'graph-link:home>detail')!;
    const back = linksGraph.edges.find((e) => e.id === 'graph-link:detail>home')!;
    expect(go.points).toHaveLength(1);
    expect(back.points).toHaveLength(1);
    expect(go.points[0]).not.toEqual(back.points[0]);
    // Écart réglable : à 0, les deux flèches passent par le même milieu.
    const { page: merged } = buildGraphPage(links, { ...DEFAULT_GRAPH_LAYOUT, pairOffset: 0 });
    const points = merged.edges.map((e) => e.points[0]);
    expect(points[0]).toEqual(points[1]);
  });

  it('sa scène ne dessine aucun élément des pages du document (pas de miniature, sujet 362)', () => {
    const ctx = { text: { create: () => new Object3D() } };
    const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'flat');
    const documentIds = new Set(parents.pages.flatMap((p) => [...p.shapes, ...p.edges].map((e) => e.id)));
    const drawn: string[] = [];
    scene.root.traverse((object) => {
      const id = object.userData.elementId as string | undefined;
      if (id !== undefined) drawn.push(id);
    });
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.filter((id) => documentIds.has(id))).toEqual([]);
  });
});
