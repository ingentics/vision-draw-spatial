import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { dragPoints, pointHandles, pointsEditor } from '../../../../src/engine/core/edit/edgePointEdits';
import type { PointHandle, PointsContext } from '../../../../src/engine/core/edit/edgePointEdits';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import type { Point } from '../../../../src/engine/core/model/types';
import { toTerminal } from '../../../../src/engine/core/render/edges/edge';
import {
  fixedAnchor,
  routeEdge,
  routeEdgePoints,
  routingCenter,
  simplify,
} from '../../../../src/engine/core/render/edges/route';
import type { Terminal } from '../../../../src/engine/core/render/edges/route';
import { drawioSvgRoutes, dropCollinear, fixture } from '../../../helpers';

/**
 * Fixture `edge-points.drawio` (étape 25) : flèches dont les points intermédiaires sont **écrits par les
 * poignées** (`dragPoints`), chaque poignée de chaque cas tirée dans les deux sens. `WRITE_FIXTURES=1` la
 * régénère ; `make drawio-check` la fait exporter en SVG par draw.io : chaque tracé doit tomber au pixel
 * près sur le nôtre (un point posé ici donne le même tracé dans draw.io).
 */

interface Base {
  style: string;
  target: { x: number; y: number };
  points?: Point[];
}

const NONE = 'endArrow=none;html=1;';
const ORTH = `edgeStyle=orthogonalEdgeStyle;rounded=0;${NONE}`;
const BASES: Base[] = [
  { style: ORTH, target: { x: 160, y: 120 } },
  { style: ORTH, target: { x: -170, y: 110 } },
  {
    style: `${ORTH}exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;`,
    target: { x: 160, y: 120 },
  },
  {
    style: `${ORTH}exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;`,
    target: { x: 160, y: 120 },
  },
  { style: ORTH, target: { x: 180, y: 0 } },
  { style: ORTH, target: { x: 0, y: 130 } },
  {
    style: ORTH,
    target: { x: 200, y: 0 },
    points: [
      { x: 160, y: 20 },
      { x: 160, y: -30 },
    ],
  },
  { style: `edgeStyle=elbowEdgeStyle;${NONE}`, target: { x: 160, y: 120 } },
  { style: `edgeStyle=elbowEdgeStyle;elbow=vertical;${NONE}`, target: { x: 160, y: 120 } },
  { style: NONE, target: { x: 160, y: 120 } },
  { style: NONE, target: { x: 160, y: 120 }, points: [{ x: 160, y: 0 }] },
];
/** Déplacements essayés pour chaque poignée (perpendiculaires pour un segment). */
const OFFSETS = [40, -40];

interface Case {
  base: number;
  /** Points intermédiaires écrits par la poignée (relatifs au coin de la source). */
  points: Point[];
  /** Poignée tirée et pointeur (relatif), pour le contrôle du segment sous le pointeur. */
  handle: PointHandle;
  pointer: Point;
}

const SOURCE = { x: 0, y: 0, width: 80, height: 40 };

function terminals(base: Base): { source: Terminal; target: Terminal } {
  return {
    source: { bounds: SOURCE, perimeter: 'rectangle' },
    target: { bounds: { ...base.target, width: 80, height: 40 }, perimeter: 'rectangle' },
  };
}

function context(base: Base, style: Record<string, string>): PointsContext {
  const { source, target } = terminals(base);
  const waypoints = base.points ?? [];
  const reroute = (points: Point[]) => routeEdgePoints({ source, target, waypoints: points, style });
  const sourceFixed = fixedAnchor(source, style, 'source');
  const targetFixed = fixedAnchor(target, style, 'target');
  return {
    editor: pointsEditor(style),
    route: reroute(waypoints),
    waypoints,
    source: source.bounds,
    target: target.bounds,
    sourceAnchor: sourceFixed ?? routingCenter(source),
    targetAnchor: targetFixed ?? routingCenter(target),
    sourceFixed: !!sourceFixed,
    targetFixed: !!targetFixed,
    reroute,
    tolerance: 4,
    handleRadius: 6,
  };
}

function parseStyle(style: string): Record<string, string> {
  return Object.fromEntries(
    style
      .split(';')
      .filter(Boolean)
      .map((token) => token.split('=') as [string, string]),
  );
}

function cases(): Case[] {
  const list: Case[] = [];
  BASES.forEach((base, b) => {
    const ctx = context(base, parseStyle(base.style));
    for (const handle of pointHandles(ctx)) {
      for (const offset of OFFSETS) {
        const pointer =
          handle.kind === 'segment'
            ? handle.vertical
              ? { x: handle.point.x + offset, y: handle.point.y }
              : { x: handle.point.x, y: handle.point.y + offset }
            : { x: handle.point.x + offset, y: handle.point.y + offset / 2 };
        const rounded = { x: Math.round(pointer.x), y: Math.round(pointer.y) };
        list.push({ base: b, points: dragPoints(ctx, handle, rounded), handle, pointer: rounded });
      }
    }
  });
  return list;
}

const COLUMNS = 8;
const origin = (index: number) => ({ x: (index % COLUMNS) * 560 + 260, y: Math.floor(index / COLUMNS) * 480 + 240 });

function build(): string {
  const cells: string[] = [];
  const shift = (o: Point, p: Point) => ({ x: o.x + p.x, y: o.y + p.y });
  cases().forEach((c, i) => {
    const base = BASES[c.base]!;
    const o = origin(i);
    const t = shift(o, base.target);
    cells.push(
      `        <mxCell id="s${i}" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${o.x}" y="${o.y}" width="80" height="40" as="geometry" />\n        </mxCell>`,
      `        <mxCell id="t${i}" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${t.x}" y="${t.y}" width="80" height="40" as="geometry" />\n        </mxCell>`,
    );
    const points = c.points.length
      ? `<Array as="points">${c.points.map((p) => `<mxPoint x="${o.x + p.x}" y="${o.y + p.y}" />`).join('')}</Array>`
      : '';
    cells.push(
      `        <mxCell id="e${i}" style="${base.style}" edge="1" parent="1" source="s${i}" target="t${i}">\n` +
        `          <mxGeometry relative="1" as="geometry">${points}</mxGeometry>\n        </mxCell>`,
    );
  });
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Points" id="edge-points">
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

describe('fixture edge-points.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../fixtures/edge-points.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('edge-points.drawio'));
  });

  it('un segment tiré passe sous le pointeur', () => {
    for (const c of cases()) {
      if (c.handle.kind !== 'segment' || c.handle.faded) continue;
      const base = BASES[c.base]!;
      const route = routeEdge({ ...terminals(base), waypoints: c.points, style: parseStyle(base.style) });
      const onPointer = route.slice(1).some((b, k) => {
        const a = route[k]!;
        return c.handle.vertical ? a.x === b.x && a.x === c.pointer.x : a.y === b.y && a.y === c.pointer.y;
      });
      expect(onPointer, JSON.stringify({ base: c.base, handle: c.handle, pointer: c.pointer, route })).toBe(true);
    }
  });
});

const SVG = fileURLToPath(new URL('../../../fixtures/drawio-saved/edge-points.svg', import.meta.url));

describe.runIf(existsSync(SVG))('edge-points.drawio : même tracé que draw.io (export SVG)', () => {
  let loaded:
    { routes: Map<string, Point[]>; page: ReturnType<typeof readDrawio>['document']['pages'][number] } | undefined;
  const load = () =>
    (loaded ??= {
      page: readDrawio(fixture('edge-points.drawio')).document.pages[0]!,
      routes: drawioSvgRoutes(fixture('drawio-saved/edge-points.svg'), { id: 's0', ...origin(0) }, (id) =>
        /^e\d+$/.test(id),
      ),
    });
  const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

  cases().forEach((c, i) => {
    it(`e${i} : ${BASES[c.base]!.style} ${c.handle.kind} ${c.handle.index}`, () => {
      const { page, routes } = load();
      const shapes = new Map(page.shapes.map((s) => [s.id, s]));
      const edge = page.edges.find((e) => e.id === `e${i}`)!;
      const ours = routeEdge({
        source: toTerminal(shapes.get(edge.sourceId ?? '')),
        target: toTerminal(shapes.get(edge.targetId ?? '')),
        waypoints: edge.points,
        style: edge.style,
      });
      const theirs = dropCollinear(simplify(routes.get(`e${i}`) ?? []));
      const message = JSON.stringify({ ours, theirs });
      expect(ours.length, message).toBe(theirs.length);
      ours.forEach((p, k) => expect(near(p, theirs[k]!), message).toBe(true));
    });
  });
});
