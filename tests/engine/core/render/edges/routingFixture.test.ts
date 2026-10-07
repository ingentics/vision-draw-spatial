import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel, Point, ShapeModel } from '../../../../../src/engine/core/model/types';
import { toTerminal } from '../../../../../src/engine/core/render/edges/edge';
import { routeEdge, simplify } from '../../../../../src/engine/core/render/edges/route';
import { drawioSvgRoutes, dropCollinear, fixture } from '../../../../helpers';

/**
 * Fixture `edge-routing.drawio` : les tracés des styles d'arête de draw.io (orthogonal flottant ou à points
 * fixes, points intermédiaires, coudes, côte à côte, haut en bas, relation d'entités, boucle, droit), dans des
 * positions relatives variées. `WRITE_FIXTURES=1` la régénère ; `make drawio-check` la fait exporter en SVG
 * par draw.io (`drawio-saved/edge-routing.svg`), et chaque tracé doit tomber au pixel près sur le sien.
 */

interface Case {
  style: string;
  /** Cible, relative au coin de la source (80 × 40) ; `null` = la source elle-même (boucle). */
  target: { x: number; y: number; w?: number; h?: number; ellipse?: boolean } | null;
  points?: Point[];
  sourcePoint?: Point;
  targetPoint?: Point;
}

const NONE = 'endArrow=none;html=1;';
const ORTH = `edgeStyle=orthogonalEdgeStyle;rounded=0;${NONE}`;
const POSITIONS = {
  R: { x: 180, y: 0 },
  DR: { x: 160, y: 120 },
  D: { x: 0, y: 130 },
  DL: { x: -170, y: 110 },
  L: { x: -180, y: 10 },
  UL: { x: -160, y: -120 },
  U: { x: 20, y: -130 },
  UR: { x: 170, y: -110 },
  NEAR: { x: 100, y: 20 },
  CLOSE: { x: 90, y: 50 },
};
const SIDES = { top: [0.5, 0], right: [1, 0.5], bottom: [0.5, 1], left: [0, 0.5] } as const;
const exit = (side: keyof typeof SIDES) => `exitX=${SIDES[side][0]};exitY=${SIDES[side][1]};exitDx=0;exitDy=0;`;
const entry = (side: keyof typeof SIDES) => `entryX=${SIDES[side][0]};entryY=${SIDES[side][1]};entryDx=0;entryDy=0;`;

function cases(): Case[] {
  const list: Case[] = [];
  const all = Object.values(POSITIONS);
  // Orthogonal flottant, écart par défaut (10) et automatique (20).
  for (const target of all) list.push({ style: ORTH, target });
  for (const target of all) list.push({ style: `${ORTH}jettySize=auto;`, target });
  // Orthogonal, points fixes des deux côtés.
  for (const s of Object.keys(SIDES) as Array<keyof typeof SIDES>)
    for (const t of Object.keys(SIDES) as Array<keyof typeof SIDES>)
      for (const target of [POSITIONS.R, POSITIONS.DR, POSITIONS.D, POSITIONS.UL])
        list.push({ style: `${ORTH}${exit(s)}${entry(t)}`, target });
  // Un seul point fixe.
  for (const s of Object.keys(SIDES) as Array<keyof typeof SIDES>)
    for (const target of [POSITIONS.DR, POSITIONS.L]) list.push({ style: `${ORTH}${exit(s)}`, target });
  for (const t of Object.keys(SIDES) as Array<keyof typeof SIDES>)
    for (const target of [POSITIONS.DR, POSITIONS.U]) list.push({ style: `${ORTH}${entry(t)}`, target });
  // Points intermédiaires (coordonnées relatives au coin de la source).
  for (const points of [
    [{ x: 120, y: 80 }],
    [{ x: 120, y: -40 }],
    [
      { x: 120, y: -40 },
      { x: 200, y: 160 },
    ],
    [{ x: 40, y: 100 }],
    [{ x: 300, y: 20 }],
    [
      { x: 110, y: 20 },
      { x: 110, y: 140 },
      { x: 250, y: 140 },
    ],
  ]) {
    list.push({ style: ORTH, target: POSITIONS.DR, points });
    list.push({ style: `${ORTH}${exit('bottom')}${entry('left')}`, target: POSITIONS.DR, points });
  }
  list.push({ style: `edgeStyle=segmentEdgeStyle;${NONE}`, target: POSITIONS.DR, points: [{ x: 120, y: 80 }] });
  list.push({ style: `edgeStyle=segmentEdgeStyle;${NONE}`, target: POSITIONS.UR, points: [{ x: 140, y: 0 }] });
  // Extrémités libres.
  list.push({ style: ORTH, target: POSITIONS.DR, sourcePoint: { x: 20, y: -60 } });
  list.push({ style: ORTH, target: POSITIONS.DR, targetPoint: { x: 260, y: 240 } });
  list.push({ style: `${ORTH}${exit('right')}`, target: POSITIONS.DR, targetPoint: { x: 200, y: 260 } });
  list.push({ style: ORTH, target: POSITIONS.UL, sourcePoint: { x: -40, y: 140 }, targetPoint: { x: 200, y: -100 } });
  // Coudes.
  for (const target of [POSITIONS.DR, POSITIONS.R, POSITIONS.D, POSITIONS.UL]) {
    list.push({ style: `edgeStyle=elbowEdgeStyle;${NONE}`, target });
    list.push({ style: `edgeStyle=elbowEdgeStyle;elbow=vertical;${NONE}`, target });
  }
  list.push({ style: `edgeStyle=elbowEdgeStyle;${NONE}`, target: POSITIONS.DR, points: [{ x: 120, y: 0 }] });
  list.push({
    style: `edgeStyle=elbowEdgeStyle;elbow=vertical;${NONE}`,
    target: POSITIONS.DR,
    points: [{ x: 0, y: 90 }],
  });
  for (const target of [POSITIONS.DR, POSITIONS.UL]) {
    list.push({ style: `edgeStyle=sideToSideEdgeStyle;${NONE}`, target });
    list.push({ style: `edgeStyle=topToBottomEdgeStyle;${NONE}`, target });
  }
  for (const target of [POSITIONS.R, POSITIONS.L, POSITIONS.DR])
    list.push({ style: `edgeStyle=entityRelationEdgeStyle;${NONE}`, target });
  // Boucles.
  list.push({ style: `${ORTH}`, target: null });
  list.push({ style: NONE, target: null });
  // Ellipses, droit et orthogonal.
  for (const target of [POSITIONS.DR, POSITIONS.U, POSITIONS.L]) {
    list.push({ style: NONE, target: { ...target, w: 80, h: 60, ellipse: true } });
    list.push({ style: ORTH, target: { ...target, w: 80, h: 60, ellipse: true } });
  }
  list.push({ style: NONE, target: POSITIONS.DR, points: [{ x: 200, y: -20 }] });
  return list;
}

/** Une case de 520 × 440 par cas, source au milieu. */
const COLUMNS = 8;
const origin = (index: number) => ({ x: (index % COLUMNS) * 520 + 220, y: Math.floor(index / COLUMNS) * 440 + 200 });

function build(): string {
  const cells: string[] = [];
  const point = (p: Point, as: string) => `<mxPoint x="${p.x}" y="${p.y}" as="${as}" />`;
  cases().forEach((c, i) => {
    const o = origin(i);
    const shift = (p: Point) => ({ x: o.x + p.x, y: o.y + p.y });
    cells.push(
      `        <mxCell id="s${i}" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${o.x}" y="${o.y}" width="80" height="40" as="geometry" />\n        </mxCell>`,
    );
    if (c.target) {
      const t = c.target;
      const style = t.ellipse ? 'ellipse;whiteSpace=wrap;html=1;' : 'rounded=0;whiteSpace=wrap;html=1;';
      cells.push(
        `        <mxCell id="t${i}" value="" style="${style}" vertex="1" parent="1">\n` +
          `          <mxGeometry x="${o.x + t.x}" y="${o.y + t.y}" width="${t.w ?? 80}" height="${t.h ?? 40}" as="geometry" />\n        </mxCell>`,
      );
    }
    const ends = [
      c.sourcePoint ? '' : ` source="s${i}"`,
      c.targetPoint ? '' : ` target="${c.target ? `t${i}` : `s${i}`}"`,
    ].join('');
    const inner = [
      c.sourcePoint && point(shift(c.sourcePoint), 'sourcePoint'),
      c.targetPoint && point(shift(c.targetPoint), 'targetPoint'),
      c.points &&
        `<Array as="points">${c.points
          .map((p) => point(shift(p), ''))
          .join('')
          .replace(/ as="" /g, ' ')}</Array>`,
    ]
      .filter(Boolean)
      .join('');
    cells.push(
      `        <mxCell id="e${i}" style="${c.style}" edge="1" parent="1"${ends}>\n` +
        `          <mxGeometry relative="1" as="geometry">${inner}</mxGeometry>\n        </mxCell>`,
    );
  });
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Tracés" id="edge-routing">
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

/** Écarts connus avec draw.io (id d'arête), à vider. */
const KNOWN_DIFFERENCES = new Set<string>();

describe('fixture edge-routing.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../../fixtures/edge-routing.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('edge-routing.drawio'));
  });
});

const SVG = fileURLToPath(new URL('../../../../fixtures/drawio-saved/edge-routing.svg', import.meta.url));

describe.runIf(existsSync(SVG))('edge-routing.drawio : même tracé que draw.io (export SVG)', () => {
  // Lus au premier test : la fixture peut être en cours de régénération (`WRITE_FIXTURES=1`).
  let loaded: { page: PageModel; routes: Map<string, Point[]>; shapes: Map<string, ShapeModel> } | undefined;
  const load = () => {
    if (loaded) return loaded;
    const page = readDrawio(fixture('edge-routing.drawio')).document.pages[0]!;
    const routes = drawioSvgRoutes(fixture('drawio-saved/edge-routing.svg'), { id: 's0', ...origin(0) }, (id) =>
      /^e\d+$/.test(id),
    );
    loaded = { page, routes, shapes: new Map(page.shapes.map((s) => [s.id, s])) };
    return loaded;
  };
  const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

  cases().forEach((c, i) => {
    const id = `e${i}`;
    (KNOWN_DIFFERENCES.has(id) ? it.fails : it)(`${id} ${c.style}`, () => {
      const { page, routes, shapes } = load();
      const edge = page.edges.find((e) => e.id === id)!;
      const ours = routeEdge({
        source: toTerminal(shapes.get(edge.sourceId ?? '')),
        target: toTerminal(shapes.get(edge.targetId ?? '')),
        sourcePoint: edge.sourcePoint,
        targetPoint: edge.targetPoint,
        waypoints: edge.points,
        style: edge.style,
      });
      const theirs = dropCollinear(simplify(routes.get(id) ?? []));
      const message = JSON.stringify({ ours, theirs });
      expect(ours.length, message).toBe(theirs.length);
      ours.forEach((p, k) => expect(near(p, theirs[k]!), message).toBe(true));
    });
  });
});
