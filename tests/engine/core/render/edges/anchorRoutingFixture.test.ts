import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Side as AnchorSide } from '../../../../../src/engine/core/edit/edgeEnds';
import { loopWaypoints } from '../../../../../src/engine/core/edit/loops';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel, Point, ShapeModel } from '../../../../../src/engine/core/model/types';
import { toTerminal } from '../../../../../src/engine/core/render/edges/terminal';
import { routeEdge, simplify } from '../../../../../src/engine/core/render/edges/route';
import { drawioSvgRoutes, dropCollinear, fixture } from '../../../../helpers';

/**
 * Fixture `anchor-routing.drawio` : le routage par points d'ancrage (étapes 108 à 111), au style des connecteurs
 * créés par l'appli. Couples côté de départ × côté d'arrivée sur des ancres hors milieu, plusieurs flèches sur un
 * même côté (subdivision), boucles sur une même forme avec leurs coudes. `WRITE_FIXTURES=1` la régénère ;
 * `make drawio-check` la fait exporter en SVG par draw.io (`drawio-saved/anchor-routing.svg`), et chaque tracé doit
 * tomber au pixel près sur le sien.
 */

/** Style d'un connecteur créé par l'appli (tracé à angles droits), sans pointe pour comparer les tracés. */
const STYLE = 'orthogonalLoop=1;jettySize=auto;html=1;edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=none;';
const SOURCE = { width: 80, height: 40 };
const SIDES: readonly AnchorSide[] = ['n', 'e', 's', 'w'];
const SIDE_NAMES: Record<AnchorSide, string> = { n: 'haut', e: 'droite', s: 'bas', w: 'gauche' };

/** Point relatif au cadre : position `t` le long du côté (de gauche à droite, de haut en bas). */
function onSide(side: AnchorSide, t: number): Point {
  if (side === 'n') return { x: t, y: 0 };
  if (side === 's') return { x: t, y: 1 };
  if (side === 'e') return { x: 1, y: t };
  return { x: 0, y: t };
}

interface Arrow {
  exit: { side: AnchorSide; t: number };
  entry: { side: AnchorSide; t: number };
}

interface Case {
  name: string;
  /** Cible, relative au coin de la source (80 × 40) ; `null` = la source elle-même (boucle). */
  target: { x: number; y: number; w?: number; h?: number } | null;
  arrows: Arrow[];
}

const POSITIONS = {
  R: { x: 200, y: 20 },
  DR: { x: 180, y: 140 },
  D: { x: 20, y: 150 },
  UL: { x: -180, y: -140 },
};

function cases(): Case[] {
  const list: Case[] = [];
  // Couples de côtés, ancres hors milieu (le départ et l'arrivée de part et d'autre du milieu).
  for (const s of SIDES)
    for (const t of SIDES)
      for (const [a, b] of [
        [0.25, 0.75],
        [0.75, 0.25],
      ] as const)
        for (const [name, target] of Object.entries(POSITIONS))
          list.push({
            name: `${SIDE_NAMES[s]} ${a} → ${SIDE_NAMES[t]} ${b}, cible ${name}`,
            target,
            arrows: [{ exit: { side: s, t: a }, entry: { side: t, t: b } }],
          });
  // Plusieurs flèches sur un même côté (subdivision des ancres).
  const fan = (side: AnchorSide, ts: number[], entrySide: AnchorSide, entries = ts): Arrow[] =>
    ts.map((t, k) => ({ exit: { side, t }, entry: { side: entrySide, t: entries[k]! } }));
  list.push({
    name: 'éventail bas → haut',
    target: { x: 0, y: 150, w: 160 },
    arrows: fan('s', [0.25, 0.5, 0.75], 'n'),
  });
  list.push({ name: 'éventail bas → gauche', target: POSITIONS.DR, arrows: fan('s', [0.25, 0.5, 0.75], 'w') });
  list.push({
    name: 'éventail droite → gauche, croisé',
    target: { x: 200, y: 0, h: 80 },
    arrows: fan('e', [0.25, 0.5, 0.75], 'w', [0.75, 0.5, 0.25]),
  });
  list.push({
    name: 'subdivision droite 1/8 → gauche',
    target: { x: 220, y: -20, h: 80 },
    arrows: fan('e', [0.125, 0.25, 0.375, 0.5, 0.75], 'w'),
  });
  list.push({
    name: 'subdivision bas 1/8 → haut',
    target: { x: -40, y: 160, w: 160 },
    arrows: fan('s', [0.125, 0.25, 0.375, 0.5, 0.75, 0.875], 'n'),
  });
  // Boucles : tous les couples de côtés (même côté : du milieu vers 0,25), puis hors milieu.
  for (const s of SIDES)
    for (const t of SIDES)
      list.push({
        name: `boucle ${SIDE_NAMES[s]} → ${SIDE_NAMES[t]}`,
        target: null,
        arrows: [{ exit: { side: s, t: 0.5 }, entry: { side: t, t: s === t ? 0.25 : 0.5 } }],
      });
  for (const [s, a, t, b] of [
    ['s', 0.25, 'n', 0.75],
    ['s', 0.75, 'n', 0.25],
    ['e', 0.25, 'w', 0.75],
    ['w', 0.75, 'e', 0.75],
    ['s', 0.25, 's', 0.75],
    ['e', 0.75, 's', 0.75],
  ] as const)
    list.push({
      name: `boucle ${SIDE_NAMES[s]} ${a} → ${SIDE_NAMES[t]} ${b}`,
      target: null,
      arrows: [{ exit: { side: s, t: a }, entry: { side: t, t: b } }],
    });
  list.push({
    name: 'deux boucles sur le bas',
    target: null,
    arrows: [
      { exit: { side: 's', t: 0.5 }, entry: { side: 's', t: 0.25 } },
      { exit: { side: 's', t: 0.75 }, entry: { side: 's', t: 0.875 } },
    ],
  });
  return list;
}

/** Une case de 520 × 440 par cas, source au milieu. */
const COLUMNS = 8;
const origin = (index: number) => ({ x: (index % COLUMNS) * 520 + 220, y: Math.floor(index / COLUMNS) * 440 + 200 });
const edgeId = (i: number, k: number) => `e${i}_${k}`;

function constraints(arrow: Arrow): string {
  const a = onSide(arrow.exit.side, arrow.exit.t);
  const b = onSide(arrow.entry.side, arrow.entry.t);
  return `exitX=${a.x};exitY=${a.y};exitDx=0;exitDy=0;entryX=${b.x};entryY=${b.y};entryDx=0;entryDy=0;`;
}

/** Coudes d'une boucle, comme l'appli les écrit (ancres d'un rectangle : sur le cadre). */
function loopPoints(bounds: { x: number; y: number; width: number; height: number }, arrow: Arrow): Point[] {
  const at = (side: AnchorSide, t: number) => {
    const c = onSide(side, t);
    return { point: { x: bounds.x + c.x * bounds.width, y: bounds.y + c.y * bounds.height }, side };
  };
  return loopWaypoints(bounds, at(arrow.exit.side, arrow.exit.t), at(arrow.entry.side, arrow.entry.t));
}

function build(): string {
  const cells: string[] = [];
  const vertex = (id: string, value: string, x: number, y: number, w: number, h: number) =>
    `        <mxCell id="${id}" value="${value}" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n` +
    `          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />\n        </mxCell>`;
  cases().forEach((c, i) => {
    const o = origin(i);
    const bounds = { x: o.x, y: o.y, ...SOURCE };
    cells.push(
      `        <mxCell id="n${i}" value="${c.name}" style="text;html=1;align=left;verticalAlign=top;fontSize=10;" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${o.x - 200}" y="${o.y - 190}" width="480" height="20" as="geometry" />\n        </mxCell>`,
    );
    cells.push(vertex(`s${i}`, '', o.x, o.y, SOURCE.width, SOURCE.height));
    const t = c.target;
    if (t) cells.push(vertex(`t${i}`, '', o.x + t.x, o.y + t.y, t.w ?? 80, t.h ?? 40));
    c.arrows.forEach((arrow, k) => {
      const points = t ? [] : loopPoints(bounds, arrow);
      const inner = points.length
        ? `<Array as="points">${points.map((p) => `<mxPoint x="${p.x}" y="${p.y}" />`).join('')}</Array>`
        : '';
      cells.push(
        `        <mxCell id="${edgeId(i, k)}" style="${STYLE}${constraints(arrow)}" edge="1" parent="1" source="s${i}" target="${t ? `t${i}` : `s${i}`}">\n` +
          `          <mxGeometry relative="1" as="geometry">${inner}</mxGeometry>\n        </mxCell>`,
      );
    });
  });
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Ancres" id="anchor-routing">
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

function routeOf(page: PageModel, shapes: Map<string, ShapeModel>, id: string): Point[] {
  const edge = page.edges.find((e) => e.id === id)!;
  return routeEdge({
    source: toTerminal(shapes.get(edge.sourceId ?? '')),
    target: toTerminal(shapes.get(edge.targetId ?? '')),
    sourcePoint: edge.sourcePoint,
    targetPoint: edge.targetPoint,
    waypoints: edge.points,
    style: edge.style,
  });
}

describe('fixture anchor-routing.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../../fixtures/anchor-routing.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('anchor-routing.drawio'));
  });

  it('aucune boucle ne traverse sa forme ni ne longe son bord', () => {
    const page = readDrawio(fixture('anchor-routing.drawio')).document.pages[0]!;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    cases().forEach((c, i) => {
      if (c.target) return;
      const b = shapes.get(`s${i}`)!.bounds;
      c.arrows.forEach((_, k) => {
        const route = routeOf(page, shapes, edgeId(i, k));
        // Milieu de chaque segment : hors de la forme (bord exclu), sauf le premier et le dernier qui en partent.
        for (let n = 1; n + 2 < route.length; n++) {
          const m = { x: (route[n]!.x + route[n + 1]!.x) / 2, y: (route[n]!.y + route[n + 1]!.y) / 2 };
          const inside = m.x >= b.x && m.x <= b.x + b.width && m.y >= b.y && m.y <= b.y + b.height;
          expect(inside, `${c.name} : ${JSON.stringify(route)}`).toBe(false);
        }
        expect(route.length, c.name).toBeGreaterThan(2);
      });
    });
  });
});

const SVG = fileURLToPath(new URL('../../../../fixtures/drawio-saved/anchor-routing.svg', import.meta.url));

describe.runIf(existsSync(SVG))('anchor-routing.drawio : même tracé que draw.io (export SVG)', () => {
  // Lus au premier test : la fixture peut être en cours de régénération (`WRITE_FIXTURES=1`).
  let loaded: { page: PageModel; routes: Map<string, Point[]>; shapes: Map<string, ShapeModel> } | undefined;
  const load = () => {
    if (loaded) return loaded;
    const page = readDrawio(fixture('anchor-routing.drawio')).document.pages[0]!;
    const routes = drawioSvgRoutes(fixture('drawio-saved/anchor-routing.svg'), { id: 's0', ...origin(0) }, (id) =>
      /^e\d+_\d+$/.test(id),
    );
    loaded = { page, routes, shapes: new Map(page.shapes.map((s) => [s.id, s])) };
    return loaded;
  };
  const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

  cases().forEach((c, i) =>
    c.arrows.forEach((_, k) => {
      const id = edgeId(i, k);
      it(`${id} ${c.name}`, () => {
        const { page, routes, shapes } = load();
        const ours = routeOf(page, shapes, id);
        const theirs = dropCollinear(simplify(routes.get(id) ?? []));
        const message = JSON.stringify({ ours, theirs });
        expect(ours.length, message).toBe(theirs.length);
        ours.forEach((p, n) => expect(near(p, theirs[n]!), message).toBe(true));
      });
    }),
  );
});
