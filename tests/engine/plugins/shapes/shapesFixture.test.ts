import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import type { PageModel, Point, ShapeModel } from '../../../../src/engine/core/model/types';
import { toTerminal } from '../../../../src/engine/core/render/edges/edge';
import { routeEdge, simplify } from '../../../../src/engine/core/render/edges/route';
import { PLUG_SHAPE } from '../../../../src/engine/plugins/shapes/architecture/plug';
import { drawioSvgOutlines, drawioSvgPaths, drawioSvgRoutes, dropCollinear, fixture } from '../../../helpers';
import { createDefaultRegistry } from '../../../../src/engine/plugins';

/**
 * Fixture `shapes.drawio` (Milestone 5) : formes géométriques de draw.io dans leurs variantes (tailles,
 * `direction`, `flipH` / `flipV`) et flèches qui s'y accrochent. `WRITE_FIXTURES=1` la régénère ;
 * `make drawio-check` la fait réenregistrer et exporter en SVG par draw.io : chaque contour et chaque tracé
 * doit tomber au pixel près sur le nôtre.
 *
 * La prise (`stencil:plug`) vérifie aussi les stencils embarqués (`mxStencil.computeAspect`) ; l'hexagone, ses pans
 * (`size`, `fixedSize`) et son périmètre (`hexagonPerimeter2`, couché et debout) ; l'octogone (`dx`) ; le
 * pentagone (stencil de draw.io).
 *
 * Le process (barres : `size`, `fixedSize`, `rounded`, `direction`) et le process à tranche étiquetée
 * (`internalStorage` : `dx`, `dy`, `rounded`, orientations) vérifient aussi leur dessin intérieur (`details`) :
 * chaque tracé de draw.io tombe sur notre contour ou notre dessin, et inversement.
 *
 * Les triangles vérifient l'orientation commune (`orientedPath`) sur une forme asymétrique, et leur périmètre
 * (`trianglePerimeter`) dans toutes les directions.
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
const HEXAGON = 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;';
const OCTAGON = 'whiteSpace=wrap;html=1;shape=mxgraph.basic.octagon2;align=center;verticalAlign=middle;dx=15;';
const PENTAGON = 'whiteSpace=wrap;html=1;shape=mxgraph.basic.pentagon;';
const TRIANGLE = 'triangle;whiteSpace=wrap;html=1;';
const FOUR_POINT_STAR =
  'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.4_point_star_2;dx=0.8;';
const SIX_POINT_STAR = 'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.6_point_star;';
const STEP = 'shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;';
const PARALLELOGRAM = 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;';
const ORIENTATIONS = [...VARIANTS, ...NORTH_FLIPS];
const PROCESS = 'shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;';
const PROCESS_VARIANTS = [
  '',
  'size=0.2;',
  'fixedSize=1;size=20;',
  'rounded=1;',
  'rounded=1;arcSize=40;',
  'direction=south;',
  'direction=north;rounded=1;',
  'flipH=1;size=0.3;',
];
/** Process à tranche étiquetée (tâche récurrente), tel que la palette le crée, puis ses variantes. */
const TAGGED =
  'shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;dx=16;dy=0;flipH=1;spacingRight=16;' +
  'spatial.kind=recurring-task;';
const TAGGED_VARIANTS = [
  '',
  'rounded=1;',
  'dx=40;',
  'dy=20;',
  'flipH=0;',
  'direction=south;',
  'direction=north;flipH=0;',
  'flipV=1;',
]; /**
 * Formes de la palette « Géométrie », chacune dans ses variantes (id `<préfixe><n>`) : orientations, puis
 * réglages propres à la forme.
 */
const SERIES = [
  // Pans de l'hexagone : px (`fixedSize=1`, bornés à la demi-largeur), puis fraction de la largeur.
  {
    prefix: 'h',
    style: HEXAGON,
    w: 120,
    h: 80,
    variants: [...ORIENTATIONS, 'size=40;', 'size=80;', 'fixedSize=0;', 'fixedSize=0;size=0.1;'],
  },
  // Coins de l'octogone : coupés de 2 × dx, bornés à la moitié du petit côté ; 0,5 sans dx.
  { prefix: 'o', style: OCTAGON, w: 160, h: 80, variants: [...ORIENTATIONS, 'dx=30;', 'dx=0;'] },
  { prefix: 'oc', style: OCTAGON, w: 100, h: 100, variants: [''] },
  { prefix: 'od', style: OCTAGON.replace('dx=15;', ''), w: 100, h: 100, variants: [''] },
  { prefix: 'pe', style: PENTAGON, w: 100, h: 90, variants: ORIENTATIONS },
  { prefix: 'pw', style: PENTAGON, w: 160, h: 60, variants: [''] },
  { prefix: 'tp', style: TRIANGLE, w: 60, h: 80, variants: ['', 'direction=north;'] },
  // Décalage du parallélogramme : px (`fixedSize=1`, au plus la largeur), puis fraction de la largeur.
  {
    prefix: 'g',
    style: PARALLELOGRAM,
    w: 120,
    h: 60,
    variants: [...ORIENTATIONS, 'size=50;', 'size=200;', 'fixedSize=0;', 'fixedSize=0;size=0.4;'],
  },
  // Profondeur de l'étape : px (`fixedSize=1`, au plus la largeur), puis fraction de la largeur.
  {
    prefix: 'st',
    style: STEP,
    w: 120,
    h: 80,
    variants: [...ORIENTATIONS, 'size=50;', 'size=200;', 'fixedSize=0;', 'fixedSize=0;size=0.4;'],
  },
  // Creux de l'étoile à 4 branches : dx / 2 des bornes ; 0,8 sans dx.
  {
    prefix: 'f',
    style: FOUR_POINT_STAR,
    w: 140,
    h: 100,
    variants: [...ORIENTATIONS, 'dx=0.3;', 'dx=0;', 'dx=1;'],
  },
  { prefix: 'fd', style: FOUR_POINT_STAR.replace('dx=0.8;', ''), w: 100, h: 100, variants: [''] },
  // Coins arrondis (`rounded=1`, rayon arcSize / 2) des polygones que draw.io sait arrondir.
  ...[
    { prefix: 'rr', style: 'rhombus;whiteSpace=wrap;html=1;', w: 120, h: 60 },
    { prefix: 'hr', style: HEXAGON, w: 120, h: 80 },
    { prefix: 'tr', style: TRIANGLE, w: 60, h: 80 },
    { prefix: 'gr', style: PARALLELOGRAM, w: 120, h: 60 },
    { prefix: 'sr', style: STEP, w: 120, h: 80 },
  ].map((series) => ({
    ...series,
    variants: ['rounded=1;', 'rounded=1;arcSize=40;', 'rounded=1;arcSize=300;', 'rounded=1;direction=north;flipH=1;'],
  })),
  { prefix: 'six', style: SIX_POINT_STAR, w: 100, h: 90, variants: ORIENTATIONS },
  { prefix: 'sixw', style: SIX_POINT_STAR, w: 160, h: 60, variants: [''] },
];
/**
 * Autres cibles des flèches (après le losange `d`), mêmes sources tout autour : préfixe des ids (`<p><k>` la
 * cible, `<p>s<k>_<i>` les sources, `<p>e<k>_<i>` les flèches), style et taille.
 */
const EDGE_TARGETS = [
  { prefix: 'x', style: HEXAGON, w: 120, h: 80 },
  { prefix: 'xn', style: `${HEXAGON}direction=north;`, w: 120, h: 80 },
  { prefix: 'xo', style: OCTAGON, w: 100, h: 100 },
  { prefix: 'xp', style: PENTAGON, w: 100, h: 90 },
  { prefix: 'xt', style: TRIANGLE, w: 60, h: 80 },
  { prefix: 'xtn', style: `${TRIANGLE}direction=north;`, w: 80, h: 60 },
  { prefix: 'xts', style: `${TRIANGLE}direction=south;`, w: 80, h: 60 },
  { prefix: 'xtw', style: `${TRIANGLE}direction=west;`, w: 60, h: 80 },
  { prefix: 'xtf', style: `${TRIANGLE}flipH=1;`, w: 60, h: 80 },
  { prefix: 'xg', style: PARALLELOGRAM, w: 120, h: 60 },
  { prefix: 'xgn', style: `${PARALLELOGRAM}direction=north;`, w: 120, h: 60 },
  { prefix: 'xgs', style: `${PARALLELOGRAM}size=50;flipH=1;`, w: 120, h: 60 },
  { prefix: 'xf', style: FOUR_POINT_STAR, w: 100, h: 100 },
  { prefix: 'xsix', style: SIX_POINT_STAR, w: 100, h: 90 },
  ...['', 'direction=north;', 'direction=south;', 'direction=west;', 'flipV=1;'].map((variant, v) => ({
    prefix: `y${v}_`,
    style: `${STEP}${variant}`,
    w: 120,
    h: 80,
  })),
];

interface Vertex {
  id: string;
  style: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Contour comparé à celui de l'export de draw.io (pas écrit dans le fichier). */
  outline?: boolean;
  /** Dessin intérieur (`details`) comparé aux tracés de l'export de draw.io. */
  details?: boolean;
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
      vertices.push({
        id: `r${s}_${v}`,
        style: `rhombus;whiteSpace=wrap;html=1;${variant}`,
        ...at,
        w,
        h,
        outline: true,
      });
    }),
  );
  [...VARIANTS, ...NORTH_FLIPS].forEach((variant, v) => {
    const at = place();
    const style = `${TRIANGLE}${variant}`;
    vertices.push({ id: `t${v}`, style, ...at, w: 80, h: 60, outline: true });
  });
  // Prise : stencil embarqué, orienté et étiré par draw.io lui-même.
  [
    { w: 100, h: 60 },
    { w: 60, h: 100 },
  ].forEach(({ w, h }, s) =>
    [...VARIANTS, ...NORTH_FLIPS].forEach((variant, v) => {
      const at = place();
      const style = `shape=${PLUG_SHAPE};whiteSpace=wrap;html=1;${variant}`;
      vertices.push({ id: `p${s}_${v}`, style, ...at, w, h, outline: true });
    }),
  );
  SERIES.forEach(({ prefix, style, w, h, variants }) =>
    variants.forEach((variant, v) => {
      vertices.push({ id: `${prefix}${v}`, style: `${style}${variant}`, ...place(), w, h, outline: true });
    }),
  );
  PROCESS_VARIANTS.forEach((variant, v) => {
    vertices.push({ id: `pr${v}`, style: `${PROCESS}${variant}`, ...place(), w: 120, h: 60, details: true });
  });
  [
    { w: 120, h: 60 },
    { w: 240, h: 40 },
  ].forEach(({ w, h }, s) =>
    TAGGED_VARIANTS.forEach((variant, v) => {
      vertices.push({ id: `tg${s}_${v}`, style: `${TAGGED}${variant}`, ...place(), w, h, details: true });
    }),
  );
  // Flèches : un losange par style de tracé, les sources tout autour, sous les formes.
  const below = 100 + (row + 1) * 160 + 300;
  EDGE_STYLES.forEach((style, k) => {
    const center = { x: 600 + k * 700, y: below };
    vertices.push({ id: `d${k}`, style: 'rhombus;whiteSpace=wrap;html=1;', ...center, w: 80, h: 80, outline: true });
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
  EDGE_TARGETS.forEach(({ prefix, style: shapeStyle, w, h }, t) =>
    EDGE_STYLES.forEach((style, k) => {
      const center = { x: 600 + k * 700, y: below + (t + 1) * 500 };
      vertices.push({ id: `${prefix}${k}`, style: shapeStyle, ...center, w, h, outline: true });
      AROUND.forEach((p, i) => {
        vertices.push({
          id: `${prefix}s${k}_${i}`,
          style: 'rounded=0;whiteSpace=wrap;html=1;',
          x: center.x + p.x,
          y: center.y + p.y,
          w: 60,
          h: 40,
        });
        edges.push({ id: `${prefix}e${k}_${i}`, style, source: `${prefix}s${k}_${i}`, target: `${prefix}${k}` });
      });
    }),
  );
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

const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 0.5 && Math.abs(a.y - b.y) <= 0.5;

/** Sommets distincts d'un polygone fermé : points confondus avec le précédent retirés (le dernier compris). */
const corners = (points: Point[]) =>
  points.filter((p, i) => !near(p, points[(i + points.length - 1) % points.length]!) || points.length === 1);

/**
 * Même polygone, quel que soit le point de départ (le chemin SVG se referme sur son premier point ; une coupe nulle,
 * octogone à `dx=0`, y laisse des points confondus).
 */
function samePolygon(oursIn: Point[], theirsIn: Point[]): boolean {
  const ours = corners(oursIn);
  const theirs = corners(theirsIn);
  return ours.length === theirs.length && ours.every((p) => theirs.some((q) => near(p, q)));
}

describe('fixture shapes.drawio', () => {
  it('ids uniques', () => {
    const { vertices, edges } = layout();
    const ids = [...vertices, ...edges].map((cell) => cell.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

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

  for (const vertex of vertices.filter((v) => v.outline)) {
    it(`contour ${vertex.id} ${vertex.style}`, () => {
      const { shapes, svg } = load();
      const shape = shapes.get(vertex.id)!;
      const theirs = drawioSvgOutlines(svg, { id: 'ref', x: 0, y: 0 }, (id) => id === vertex.id).get(vertex.id)!;
      const ours = registry.resolve(shape).definition.outline!(shape);
      expect(samePolygon(ours, theirs), JSON.stringify({ ours, theirs })).toBe(true);
    });
  }

  for (const vertex of vertices.filter((v) => v.details)) {
    it(`dessin intérieur ${vertex.id} ${vertex.style.slice(0, 60)}`, () => {
      const { shapes, svg } = load();
      const shape = shapes.get(vertex.id)!;
      const definition = registry.resolve(shape).definition;
      const details = definition.details!(shape).flatMap((detail) => ('path' in detail ? detail.path : []));
      const ours = [...definition.outline!(shape), ...details];
      const theirs = drawioSvgPaths(svg, { id: 'ref', x: 0, y: 0 }, vertex.id).flat();
      const message = JSON.stringify({ details, theirs });
      expect(
        details.every((p) => theirs.some((q) => near(p, q))),
        message,
      ).toBe(true);
      expect(
        theirs.every((p) => ours.some((q) => near(p, q))),
        message,
      ).toBe(true);
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
