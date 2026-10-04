import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/format/parse';
import type { PageModel, Point, ShapeModel } from '../../../../src/engine/model/types';
import { toTerminal } from '../../../../src/engine/render/edges/edge';
import { routeEdge, simplify } from '../../../../src/engine/render/edges/route';
import { orientedPath } from '../../../../src/engine/render/geometry/orient';
import { createDefaultRegistry } from '../../../../src/engine/render/shapes/registry';
import { drawioSvgOutlines, drawioSvgRoutes, dropCollinear, fixture } from '../../../helpers';

/**
 * Fixture `shapes.drawio` (Milestone 5) : formes géométriques de draw.io dans leurs variantes (tailles,
 * `direction`, `flipH` / `flipV`) et flèches qui s'y accrochent. `WRITE_FIXTURES=1` la régénère ;
 * `make drawio-check` la fait réenregistrer et exporter en SVG par draw.io : chaque contour et chaque tracé
 * doit tomber au pixel près sur le nôtre.
 *
 * Les triangles ne sont pas encore dessinés par le moteur : ils servent à vérifier l'orientation commune
 * (`orientedPath`) sur une forme asymétrique, avec le contour local de `mxTriangle`.
 */

const VARIANTS = [
  '',
  'direction=south;',
  'direction=west;',
  'direction=north;',
  'flipH=1;',
  'flipV=1;',
  'flipH=1;flipV=1;',
];
const NORTH_FLIPS = ['direction=north;flipH=1;', 'direction=south;flipV=1;', 'direction=west;flipH=1;'];
const RHOMBUS_SIZES = [
  { w: 80, h: 80 },
  { w: 120, h: 60 },
  { w: 60, h: 100 },
];
/** Sources des flèches vers le losange, relatives à son coin (losange 80 × 80, source 60 × 40). */
const AROUND = [
  { x: 200, y: 20 },
  { x: 180, y: 180 },
  { x: 10, y: 200 },
  { x: -180, y: 160 },
  { x: -200, y: 20 },
  { x: -170, y: -160 },
  { x: 30, y: -200 },
  { x: 170, y: -150 },
];
const EDGE_STYLES = ['endArrow=none;html=1;', 'edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=none;html=1;'];

interface Vertex {
  id: string;
  style: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Edge {
  id: string;
  style: string;
  source: string;
  target: string;
}

function layout(): { vertices: Vertex[]; edges: Edge[] } {
  const vertices: Vertex[] = [{ id: 'ref', style: 'rounded=0;whiteSpace=wrap;html=1;', x: 0, y: 0, w: 40, h: 40 }];
  const edges: Edge[] = [];
  let column = 0;
  let row = 0;
  const place = () => {
    const at = { x: 100 + column * 160, y: 100 + row * 160 };
    column = (column + 1) % 8;
    if (column === 0) row++;
    return at;
  };
  RHOMBUS_SIZES.forEach(({ w, h }, s) =>
    [...VARIANTS, ...NORTH_FLIPS].forEach((variant, v) => {
      const at = place();
      vertices.push({ id: `r${s}_${v}`, style: `rhombus;whiteSpace=wrap;html=1;${variant}`, ...at, w, h });
    }),
  );
  [...VARIANTS, ...NORTH_FLIPS].forEach((variant, v) => {
    const at = place();
    vertices.push({ id: `t${v}`, style: `triangle;whiteSpace=wrap;html=1;${variant}`, ...at, w: 80, h: 60 });
  });
  // Flèches : un losange par style de tracé, les sources tout autour.
  EDGE_STYLES.forEach((style, k) => {
    const center = { x: 600 + k * 700, y: 1100 };
    vertices.push({ id: `d${k}`, style: 'rhombus;whiteSpace=wrap;html=1;', ...center, w: 80, h: 80 });
    AROUND.forEach((p, i) => {
      vertices.push({
        id: `s${k}_${i}`,
        style: 'rounded=0;whiteSpace=wrap;html=1;',
        x: center.x + p.x,
        y: center.y + p.y,
        w: 60,
        h: 40,
      });
      edges.push({ id: `e${k}_${i}`, style, source: `s${k}_${i}`, target: `d${k}` });
    });
  });
  return { vertices, edges };
}

function build(): string {
  const { vertices, edges } = layout();
  const cells = [
    ...vertices.map(
      (v) =>
        `        <mxCell id="${v.id}" value="" style="${v.style}" vertex="1" parent="1">\n` +
        `          <mxGeometry${v.x ? ` x="${v.x}"` : ''}${v.y ? ` y="${v.y}"` : ''} width="${v.w}" height="${v.h}" as="geometry" />\n        </mxCell>`,
    ),
    ...edges.map(
      (e) =>
        `        <mxCell id="${e.id}" style="${e.style}" edge="1" parent="1" source="${e.source}" target="${e.target}">\n` +
        `          <mxGeometry relative="1" as="geometry" />\n        </mxCell>`,
    ),
  ];
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Formes" id="shapes">
    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

/** Contour local de `mxTriangle` (pointe à droite). */
const triangle = (w: number, h: number): Point[] => [
  { x: 0, y: 0 },
  { x: w, y: h / 2 },
  { x: 0, y: h },
];

const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5;

/** Même polygone, quel que soit le point de départ (le chemin SVG se referme sur son premier point). */
function samePolygon(ours: Point[], theirsIn: Point[]): boolean {
  const theirs =
    theirsIn.length > 1 && near(theirsIn[0]!, theirsIn[theirsIn.length - 1]!) ? theirsIn.slice(0, -1) : theirsIn;
  return ours.length === theirs.length && ours.every((p) => theirs.some((q) => near(p, q)));
}

describe('fixture shapes.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../fixtures/shapes.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('shapes.drawio'));
  });
});

const SVG = fileURLToPath(new URL('../../../fixtures/drawio-saved/shapes.svg', import.meta.url));

describe.runIf(existsSync(SVG))('shapes.drawio : mêmes contours et mêmes flèches que draw.io (export SVG)', () => {
  let loaded: { page: PageModel; shapes: Map<string, ShapeModel>; svg: string } | undefined;
  const load = () => {
    if (loaded) return loaded;
    const page = readDrawio(fixture('shapes.drawio')).document.pages[0]!;
    loaded = { page, shapes: new Map(page.shapes.map((s) => [s.id, s])), svg: fixture('drawio-saved/shapes.svg') };
    return loaded;
  };
  const registry = createDefaultRegistry();
  const { vertices, edges } = layout();

  for (const vertex of vertices.filter((v) => /^[rtd]\d/.test(v.id))) {
    it(`contour ${vertex.id} ${vertex.style}`, () => {
      const { shapes, svg } = load();
      const shape = shapes.get(vertex.id)!;
      const theirs = drawioSvgOutlines(svg, { id: 'ref', x: 0, y: 0 }, (id) => id === vertex.id).get(vertex.id)!;
      const ours = vertex.id.startsWith('t')
        ? orientedPath(shape.bounds, shape.style, triangle)
        : registry.resolve(shape).definition.outline!(shape);
      expect(samePolygon(ours, theirs), JSON.stringify({ ours, theirs })).toBe(true);
    });
  }

  for (const edge of edges) {
    it(`flèche ${edge.id} ${edge.style}`, () => {
      const { page, shapes, svg } = load();
      const model = page.edges.find((e) => e.id === edge.id)!;
      const ours = routeEdge({
        source: toTerminal(shapes.get(model.sourceId ?? '')),
        target: toTerminal(shapes.get(model.targetId ?? '')),
        waypoints: model.points,
        style: model.style,
      });
      const theirs = dropCollinear(
        simplify(drawioSvgRoutes(svg, { id: 'ref', x: 0, y: 0 }, (id) => id === edge.id).get(edge.id) ?? []),
      );
      const message = JSON.stringify({ ours, theirs });
      expect(ours.length, message).toBe(theirs.length);
      ours.forEach((p, k) =>
        expect(Math.abs(p.x - theirs[k]!.x) <= 1 && Math.abs(p.y - theirs[k]!.y) <= 1, message).toBe(true),
      );
    });
  }
});
