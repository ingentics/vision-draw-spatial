import { describe, expect, it } from 'vitest';
import {
  arrangeAnchors,
  arrangementChanges,
  arrangementConflicts,
} from '../../../../../../src/engine/core/edit/anchoring/auto/anchorArrangement';
import { avoidRoutes } from '../../../../../../src/engine/core/edit/anchoring/auto/avoid';
import { DEFAULT_AVOID_OPTIONS } from '../../../../../../src/engine/core/edit/anchoring/routing';
import {
  anchorSeedOf,
  distributeAnchors,
  withNeighbours,
} from '../../../../../../src/engine/core/edit/anchoring/auto/distribute';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';

const shape = (id: string, x: number, y: number, w = 100, h = 60) =>
  `<mxCell id="${id}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const RIGHT_TO_LEFT =
  'edgeStyle=orthogonalEdgeStyle;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';
const edge = (id: string, source: string, target: string, style = RIGHT_TO_LEFT) =>
  `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="${style}"><mxGeometry relative="1" as="geometry"/></mxCell>`;

function page(cells: string[], attributes = '') {
  const xml =
    `<mxfile><diagram id="p"${attributes}><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>` +
    cells.join('') +
    '</root></mxGraphModel></diagram></mxfile>';
  return readDrawio(xml).document.pages[0]!;
}

/** Deux formes séparées par un mur : on peut le contourner par le haut ou par le bas. */
const WALLED = () => page([shape('a', 0, 0), shape('b', 400, 0), shape('w', 180, -40, 40, 140), edge('e', 'a', 'b')]);

describe('arrangeAnchors', () => {
  it('graine 0 : la répartition et le tracé par défaut', () => {
    const p = WALLED();
    const all = new Set(p.shapes.map((s) => s.id));
    const arrangement = arrangeAnchors(p, all, { route: DEFAULT_AVOID_OPTIONS });
    expect(arrangement.constraints).toEqual(distributeAnchors(p, all));
    expect(arrangement.routes).toEqual(avoidRoutes(p, arrangement.edgeIds, DEFAULT_AVOID_OPTIONS));
    expect(arrangement.edgeIds).toEqual(new Set(['e']));
  });

  it('une autre graine propose un autre contournement, sans conflit ajouté', () => {
    const p = WALLED();
    const all = new Set(p.shapes.map((s) => s.id));
    const base = arrangeAnchors(p, all, { route: DEFAULT_AVOID_OPTIONS });
    const others = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      arrangeAnchors(p, all, { seed, route: DEFAULT_AVOID_OPTIONS }),
    );
    const different = others.filter((o) => JSON.stringify(o.routes.get('e')) !== JSON.stringify(base.routes.get('e')));
    expect(different.length).toBeGreaterThan(0);
    for (const o of different) expect(arrangementConflicts(p, o)).toBeLessThanOrEqual(arrangementConflicts(p, base));
  });

  it('une graine change l’ordre d’un faisceau de flèches équivalentes, aux deux bouts', () => {
    const p = page([
      shape('a', 0, 0, 100, 120),
      shape('b', 300, 0, 100, 120),
      edge('e1', 'a', 'b'),
      edge('e2', 'a', 'b'),
      edge('e3', 'a', 'b'),
    ]);
    const all = new Set(['a', 'b']);
    const orderOf = (seed: number) => {
      const changes = distributeAnchors(p, all, seed);
      const y = (id: string, end: 'source' | 'target') =>
        changes.find((c) => c.edgeId === id && c.end === end)?.constraint.y ?? 0.5;
      const source = ['e1', 'e2', 'e3'].sort((m, n) => y(m, 'source') - y(n, 'source'));
      const target = ['e1', 'e2', 'e3'].sort((m, n) => y(m, 'target') - y(n, 'target'));
      // Face à face : même ordre aux deux bouts, donc pas de croisement.
      expect(target).toEqual(source);
      return source.join();
    };
    const orders = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map(orderOf));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('arrangementChanges : rien à changer une fois l’agencement écrit', () => {
    const p = WALLED();
    const all = new Set(p.shapes.map((s) => s.id));
    const arrangement = arrangeAnchors(p, all, { route: DEFAULT_AVOID_OPTIONS });
    expect(arrangementChanges(p, arrangement)).toBe(true);
    p.edges[0]!.points = arrangement.routes.get('e')!;
    expect(arrangementChanges(p, arrangeAnchors(p, all, { route: DEFAULT_AVOID_OPTIONS }))).toBe(false);
  });
});

describe('graine et voisinage', () => {
  it('anchorSeedOf : entier positif, 0 sinon', () => {
    expect(anchorSeedOf(page([]))).toBe(0);
    expect(anchorSeedOf(page([], ' spatial.anchorSeed="3"'))).toBe(3);
    expect(anchorSeedOf(page([], ' spatial.anchorSeed="abc"'))).toBe(0);
  });

  it('withNeighbours : les formes et celles à l’autre bout de leurs flèches', () => {
    const p = page([
      shape('a', 0, 0),
      shape('b', 300, 0),
      shape('c', 600, 0),
      shape('d', 900, 0),
      edge('e', 'a', 'b'),
      edge('f', 'b', 'c'),
    ]);
    expect([...withNeighbours(p, ['a'])].sort()).toEqual(['a', 'b']);
    expect([...withNeighbours(p, ['b'])].sort()).toEqual(['a', 'b', 'c']);
  });
});
