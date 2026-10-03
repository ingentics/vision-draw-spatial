import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { endAttachmentOf, writeEndAttachment } from '../../../src/engine/edit/edgeEnds';
import type { EndAttachment, TerminalEnd } from '../../../src/engine/edit/edgeEnds';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';
import { routeEdge, simplify } from '../../../src/engine/render/edges/route';
import type { Point } from '../../../src/engine/model/types';
import { fixture } from '../../helpers';

/**
 * Fixture `edge-ends.drawio` (étape 24) : chaque cas d'attache d'un bout de flèche, écrit par le moteur
 * (`writeEndAttachment`) à partir de flèches sans bouts. `WRITE_FIXTURES=1` la régénère ; sinon on vérifie
 * qu'elle est bien la sortie du moteur, puis que draw.io la relit à l'identique (`drawio-saved/`, après
 * `make drawio-check`).
 */

const shape = (id: string, value: string, style: string, x: number, y: number, w: number, h: number, parent = '1') =>
  `        <mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="${parent}">
          <mxGeometry${x ? ` x="${x}"` : ''}${y ? ` y="${y}"` : ''} width="${w}" height="${h}" as="geometry" />
        </mxCell>`;
const edge = (id: string, style: string, parent = '1') =>
  `        <mxCell id="${id}" style="${style}" edge="1" parent="${parent}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;

const RECT = 'rounded=0;whiteSpace=wrap;html=1;';
const STRAIGHT = 'endArrow=none;html=1;';
const ORTHOGONAL = 'edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=none;html=1;';

const BASE = `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Bouts" id="edge-ends">
    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${shape('a', 'A', RECT, 40, 40, 120, 60)}
${shape('b', 'B', RECT, 320, 40, 120, 60)}
${shape('c', 'C', RECT, 40, 240, 120, 60)}
${shape('d', 'D', 'ellipse;whiteSpace=wrap;html=1;', 320, 240, 120, 80)}
${shape('g', '', 'group', 560, 40, 200, 200)}
${shape('g1', 'G1', RECT, 0, 0, 120, 60, 'g')}
${edge('e1', STRAIGHT)}
${edge('e2', ORTHOGONAL)}
${edge('e3', STRAIGHT)}
${edge('e4', STRAIGHT)}
${edge('e5', ORTHOGONAL)}
${edge('e6', STRAIGHT)}
${edge('e7', STRAIGHT, 'g')}
${edge('e8', ORTHOGONAL)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

const floating = (shapeId: string): EndAttachment => ({ kind: 'floating', shapeId });
const fixed = (shapeId: string, x: number, y: number): EndAttachment => ({
  kind: 'fixed',
  shapeId,
  constraint: { x, y },
});
const free = (x: number, y: number): EndAttachment => ({ kind: 'free', point: { x, y } });

/** Bouts de chaque flèche (coordonnées de page, même pour la flèche du groupe). */
export const CASES: Record<string, Record<TerminalEnd, EndAttachment>> = {
  e1: { source: floating('a'), target: floating('b') }, // auto des deux côtés
  e2: { source: fixed('a', 0.5, 1), target: fixed('c', 0.5, 0) }, // orthogonale, deux points fixes
  e3: { source: floating('b'), target: fixed('d', 0, 0.5) }, // entrée fixe sur une ellipse
  e4: { source: free(200, 200), target: floating('c') }, // départ libre
  e5: { source: fixed('a', 1, 0.5), target: free(260, 180) }, // orthogonale, arrivée libre
  e6: { source: free(40, 380), target: free(440, 380) }, // deux bouts libres
  e7: { source: floating('g1'), target: free(720, 200) }, // dans un groupe : point relatif au groupe
  e8: { source: fixed('c', 1, 0.5), target: fixed('d', 0.5, 1) }, // orthogonale, côtés perpendiculaires
};

function build(): string {
  const { document, tree } = readDrawio(BASE);
  const page = document.pages[0]!;
  for (const [id, ends] of Object.entries(CASES)) {
    const model = page.edges.find((e) => e.id === id)!;
    for (const end of ['source', 'target'] as const) writeEndAttachment(tree.pages[0]!, page, model, end, ends[end]);
  }
  return writeDrawio(tree);
}

describe('fixture edge-ends.drawio', () => {
  it('est la sortie du moteur', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../fixtures/edge-ends.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('edge-ends.drawio'));
  });

  for (const [label, name] of [
    ['relue par le moteur', 'edge-ends.drawio'],
    ['réenregistrée par draw.io : mêmes bouts', 'drawio-saved/edge-ends.drawio'],
  ] as const) {
    it(label, () => {
      const page = readDrawio(fixture(name)).document.pages[0]!;
      for (const [id, ends] of Object.entries(CASES)) {
        const model = page.edges.find((e) => e.id === id)!;
        for (const end of ['source', 'target'] as const)
          expect(endAttachmentOf(model, end), `${id} ${end}`).toEqual(ends[end]);
      }
    });
  }
});

/**
 * Tracés de draw.io (export SVG de `make drawio-check`, `drawio-saved/edge-ends.svg`) : chemin de chaque
 * flèche (`data-cell-id`), ramené en coordonnées de page (l'export est décalé sur l'emprise du dessin,
 * mesurée sur la forme `a`).
 */
function drawioRoutes(svg: string): Map<string, Point[]> {
  const shift = /data-cell-id="a".*?<rect x="([-\d.]+)" y="([-\d.]+)"/s.exec(svg)!;
  const dx = 40 - parseFloat(shift[1]!);
  const dy = 40 - parseFloat(shift[2]!);
  const routes = new Map<string, Point[]>();
  for (const match of svg.matchAll(/data-cell-id="(e\d+)".*?<path d="([^"]*)"/gs)) {
    const numbers = match[2]!.match(/-?[\d.]+/g)!.map(Number);
    const points: Point[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i]! + dx, y: numbers[i + 1]! + dy });
    routes.set(match[1]!, points);
  }
  return routes;
}

const SVG = fileURLToPath(new URL('../../fixtures/drawio-saved/edge-ends.svg', import.meta.url));

/** Tracés dont le milieu diffère encore de draw.io (étape 25 : routeur orthogonal aligné sur draw.io). */
const KNOWN_ROUTE_DIFFERENCES = new Set(['e8']);

describe.runIf(existsSync(SVG))('edge-ends.drawio : même tracé que draw.io (export SVG)', () => {
  const page = readDrawio(fixture('edge-ends.drawio')).document.pages[0]!;
  const routes = drawioRoutes(fixture('drawio-saved/edge-ends.svg'));
  const terminal = (id: string | undefined) => {
    const shape = page.shapes.find((s) => s.id === id);
    return (
      shape && {
        bounds: shape.bounds,
        perimeter: shape.kind === 'ellipse' ? ('ellipse' as const) : ('rectangle' as const),
      }
    );
  };
  const ourRoute = (id: string) => {
    const model = page.edges.find((e) => e.id === id)!;
    return routeEdge({
      source: terminal(model.sourceId),
      target: terminal(model.targetId),
      sourcePoint: model.sourcePoint,
      targetPoint: model.targetPoint,
      waypoints: model.points,
      style: model.style,
    });
  };
  /** Au pixel près (draw.io arrondit parfois à la demi-unité). */
  const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

  for (const id of Object.keys(CASES)) {
    it(`${id} : mêmes bouts`, () => {
      const ours = ourRoute(id);
      const theirs = routes.get(id)!;
      expect(near(ours[0]!, theirs[0]!), JSON.stringify([ours[0], theirs[0]])).toBe(true);
      expect(near(ours.at(-1)!, theirs.at(-1)!), JSON.stringify([ours.at(-1), theirs.at(-1)])).toBe(true);
    });
    (KNOWN_ROUTE_DIFFERENCES.has(id) ? it.fails : it)(`${id} : même tracé`, () => {
      const ours = ourRoute(id);
      const theirs = simplify(routes.get(id)!);
      expect(ours.length, JSON.stringify({ ours, theirs })).toBe(theirs.length);
      ours.forEach((p, i) => expect(near(p, theirs[i]!), JSON.stringify({ ours, theirs })).toBe(true));
    });
  }
});
