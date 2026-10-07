import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { distributeAnchors, sideMiddle } from '../../../../../src/engine/core/edit/anchoring/auto/distribute';
import type { AnchorSide } from '../../../../../src/engine/core/edit/edgeEnds';
import { avoidRoutes } from '../../../../../src/engine/core/edit/anchoring/auto/avoid';
import { segmentsOf } from '../../../../../src/engine/core/edit/anchoring/auto/routeAround';
import { loopWaypoints } from '../../../../../src/engine/core/edit/loops';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel, Point, ShapeModel } from '../../../../../src/engine/core/model/types';
import { toTerminal } from '../../../../../src/engine/core/render/edges/edge';
import { routeEdge, simplify } from '../../../../../src/engine/core/render/edges/route';
import { drawioSvgRoutes, dropCollinear, fixture } from '../../../../helpers';

/**
 * Fixture `anchor-auto-routing.drawio` : le routage en ancrage automatique (étape 114). La page est en
 * `spatial.anchoring="auto"` ; chaque flèche ne donne que ses côtés, et la répartition du moteur (`distributeAnchors`)
 * écrit ses points d'attache, comme après une édition dans l'appli. `WRITE_FIXTURES=1` la régénère ;
 * `make drawio-check` la fait exporter en SVG par draw.io (`drawio-saved/anchor-auto-routing.svg`), et chaque tracé
 * doit tomber au pixel près sur le sien.
 */

/** Style d'un connecteur créé par l'appli (tracé à angles droits), sans pointe pour comparer les tracés. */
const STYLE = 'orthogonalLoop=1;jettySize=auto;html=1;edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=none;';

interface Box {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}

/** Flèche de `from` (côté `exit`) vers `to` (côté `entry`) ; `from === to` : boucle. */
interface Link {
  from: string;
  exit: AnchorSide;
  to: string;
  entry: AnchorSide;
}

interface Case {
  name: string;
  /** Formes, relatives au coin de la case ; la première est la forme centrale. */
  boxes: Box[];
  links: Link[];
}

const link = (from: string, exit: AnchorSide, to: string, entry: AnchorSide): Link => ({ from, exit, to, entry });

function cases(): Case[] {
  const list: Case[] = [];
  // Éventails de 1 à 5 flèches arrivant sur le haut, satellites déclarés de droite à gauche.
  for (let n = 1; n <= 5; n++) {
    const boxes: Box[] = [{ id: 'h', x: 0, y: 0, w: 160, h: 60 }];
    for (let k = n - 1; k >= 0; k--)
      boxes.push({ id: `a${k}`, x: n === 1 ? 50 : -160 + (k * 480) / (n - 1), y: -170, w: 60, h: 40 });
    list.push({
      name: `éventail de ${n} sur le haut`,
      boxes,
      links: boxes.slice(1).map((b) => link(b.id, 's', 'h', 'n')),
    });
  }
  // Éventails de 2 à 5 flèches partant du bas.
  for (let n = 2; n <= 5; n++) {
    const boxes: Box[] = [{ id: 'h', x: 0, y: 0, w: 160, h: 60 }];
    for (let k = 0; k < n; k++) boxes.push({ id: `b${k}`, x: -160 + k * (480 / (n - 1)), y: 180, w: 60, h: 40 });
    list.push({
      name: `éventail de ${n} depuis le bas`,
      boxes,
      links: boxes.slice(1).map((b) => link('h', 's', b.id, 'n')),
    });
  }
  // Deux flèches sur chacun des quatre côtés.
  list.push({
    name: 'quatre côtés, deux flèches chacun',
    boxes: [
      { id: 'h', x: 0, y: 0, w: 100, h: 60 },
      { id: 'n0', x: -100, y: -170 },
      { id: 'n1', x: 120, y: -170 },
      { id: 'e0', x: 230, y: -110 },
      { id: 'e1', x: 230, y: 130 },
      { id: 's0', x: -100, y: 190 },
      { id: 's1', x: 120, y: 190 },
      { id: 'w0', x: -210, y: -110 },
      { id: 'w1', x: -210, y: 130 },
    ],
    links: [
      link('h', 'n', 'n0', 's'),
      link('h', 'n', 'n1', 's'),
      link('h', 'e', 'e0', 'w'),
      link('h', 'e', 'e1', 'w'),
      link('s0', 'n', 'h', 's'),
      link('s1', 'n', 'h', 's'),
      link('w0', 'e', 'h', 'w'),
      link('w1', 'e', 'h', 'w'),
    ],
  });
  // Flèches parallèles entre deux formes, dans les deux sens.
  list.push({
    name: 'parallèles, trois aller et deux retour',
    boxes: [
      { id: 'a', x: 0, y: 0, w: 100, h: 100 },
      { id: 'b', x: 260, y: 20, w: 100, h: 100 },
    ],
    links: [
      link('a', 'e', 'b', 'w'),
      link('a', 'e', 'b', 'w'),
      link('a', 'e', 'b', 'w'),
      link('b', 'w', 'a', 'e'),
      link('b', 'w', 'a', 'e'),
    ],
  });
  // Satellites déclarés dans le désordre : rangés par position, sans croisement.
  list.push({
    name: 'arrivées sur la droite, satellites dans le désordre',
    boxes: [
      { id: 'h', x: 0, y: 0, w: 80, h: 120 },
      { id: 'c', x: 240, y: 120 },
      { id: 'a', x: 220, y: -150 },
      { id: 'd', x: 200, y: 230 },
      { id: 'b', x: 260, y: -20 },
    ],
    links: ['c', 'a', 'd', 'b'].map((id) => link(id, 'w', 'h', 'e')),
  });
  // Départs et arrivées mêlés sur un même côté.
  list.push({
    name: 'départs et arrivées sur le bas',
    boxes: [
      { id: 'h', x: 0, y: 0, w: 160, h: 60 },
      { id: 'p', x: -180, y: 180 },
      { id: 'q', x: -40, y: 200 },
      { id: 'r', x: 100, y: 200 },
      { id: 's', x: 240, y: 180 },
    ],
    links: [link('h', 's', 'p', 'n'), link('r', 'n', 'h', 's'), link('h', 's', 's', 'n'), link('q', 'n', 'h', 's')],
  });
  // Boucles.
  list.push({
    name: 'boucle bas → bas',
    boxes: [{ id: 'h', x: 0, y: 0, w: 120, h: 60 }],
    links: [link('h', 's', 'h', 's')],
  });
  list.push({
    name: 'boucle droite → haut',
    boxes: [{ id: 'h', x: 0, y: 0, w: 120, h: 60 }],
    links: [link('h', 'e', 'h', 'n')],
  });
  list.push({
    name: 'boucle haut → bas',
    boxes: [{ id: 'h', x: 0, y: 0, w: 120, h: 60 }],
    links: [link('h', 'n', 'h', 's')],
  });
  list.push({
    name: 'boucle et flèches sur le bas',
    boxes: [
      { id: 'h', x: 0, y: 0, w: 160, h: 60 },
      { id: 'p', x: -160, y: 200 },
      { id: 'q', x: 240, y: 200 },
    ],
    links: [link('h', 's', 'p', 'n'), link('h', 's', 'h', 's'), link('q', 'n', 'h', 's')],
  });
  list.push({
    name: 'deux boucles et une flèche à droite',
    boxes: [
      { id: 'h', x: 0, y: 0, w: 100, h: 120 },
      { id: 'r', x: 240, y: 40 },
    ],
    links: [link('h', 'e', 'h', 'e'), link('h', 'e', 'r', 'w'), link('h', 'n', 'h', 'e')],
  });
  // Obstacles : le tracé contourne les formes, les flèches d'un même couloir passent côte à côte.
  list.push({
    name: 'obstacle entre deux formes',
    boxes: [
      { id: 'a', x: -220, y: 0 },
      { id: 'b', x: 140, y: 0 },
      { id: 'w', x: -20, y: -40, w: 40, h: 120 },
    ],
    links: [link('a', 'e', 'b', 'w')],
  });
  list.push({
    name: 'mur percé',
    boxes: [
      { id: 'a', x: -220, y: 0 },
      { id: 'b', x: 140, y: 0 },
      { id: 'w0', x: -20, y: -130, w: 40, h: 80 },
      { id: 'w1', x: -20, y: 10, w: 40, h: 20 },
      { id: 'w2', x: -20, y: 90, w: 40, h: 80 },
    ],
    links: [link('a', 'e', 'b', 'w'), link('a', 'e', 'b', 'w')],
  });
  list.push({
    name: 'B à gauche de A',
    boxes: [
      { id: 'a', x: 0, y: 0, w: 100, h: 50 },
      { id: 'b', x: -170, y: -120, w: 100, h: 50 },
      { id: 'c', x: 80, y: 130, w: 100, h: 50 },
    ],
    links: [link('a', 'e', 'b', 'w'), link('a', 's', 'c', 'n'), link('b', 's', 'c', 'n')],
  });
  list.push({
    name: 'couloir partagé',
    boxes: [
      { id: 'a0', x: -240, y: -60 },
      { id: 'a1', x: -240, y: 40 },
      { id: 'b0', x: 180, y: -60 },
      { id: 'b1', x: 180, y: 40 },
      { id: 'w', x: -60, y: -120, w: 120, h: 240 },
    ],
    links: [link('a0', 'e', 'b0', 'w'), link('a1', 'e', 'b1', 'w'), link('a0', 'n', 'b1', 'n')],
  });
  list.push({
    name: 'cible au-dessus du départ',
    boxes: [
      { id: 'a', x: 0, y: 80, w: 120, h: 50 },
      { id: 'b', x: 20, y: -100, w: 120, h: 50 },
    ],
    links: [link('a', 's', 'b', 'n'), link('a', 'e', 'b', 'e')],
  });
  return list;
}

/** Une case de 640 × 560 par cas, forme centrale au milieu. */
const COLUMNS = 6;
const origin = (index: number) => ({ x: (index % COLUMNS) * 640 + 260, y: Math.floor(index / COLUMNS) * 560 + 240 });
const shapeId = (i: number, box: string) => `c${i}${box}`;
const edgeId = (i: number, k: number) => `e${i}_${k}`;

/** Points d'attache (relatifs au cadre) et coudes des boucles, par id de flèche. */
type Ends = Map<string, { exit: Point; entry: Point; points: Point[] }>;

function xml(ends: Ends): string {
  const cells: string[] = [];
  cases().forEach((c, i) => {
    const o = origin(i);
    cells.push(
      `        <mxCell id="n${i}" value="${c.name}" style="text;html=1;align=left;verticalAlign=top;fontSize=10;" vertex="1" parent="1">\n` +
        `          <mxGeometry x="${o.x - 240}" y="${o.y - 230}" width="600" height="20" as="geometry" />\n        </mxCell>`,
    );
    for (const b of c.boxes)
      cells.push(
        `        <mxCell id="${shapeId(i, b.id)}" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">\n` +
          `          <mxGeometry x="${o.x + b.x}" y="${o.y + b.y}" width="${b.w ?? 80}" height="${b.h ?? 40}" as="geometry" />\n        </mxCell>`,
      );
    c.links.forEach((l, k) => {
      const id = edgeId(i, k);
      const end = ends.get(id) ?? { exit: sideMiddle(l.exit), entry: sideMiddle(l.entry), points: [] };
      const style =
        `${STYLE}exitX=${end.exit.x};exitY=${end.exit.y};exitDx=0;exitDy=0;` +
        `entryX=${end.entry.x};entryY=${end.entry.y};entryDx=0;entryDy=0;`;
      const inner = end.points.length
        ? `<Array as="points">${end.points.map((p) => `<mxPoint x="${p.x}" y="${p.y}" />`).join('')}</Array>`
        : '';
      cells.push(
        `        <mxCell id="${id}" style="${style}" edge="1" parent="1" source="${shapeId(i, l.from)}" target="${shapeId(i, l.to)}">\n` +
          `          <mxGeometry relative="1" as="geometry">${inner}</mxGeometry>\n        </mxCell>`,
      );
    });
  });
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Ancrage automatique" id="anchor-auto-routing" spatial.anchoring="auto">
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

const sideOf = (c: Point): AnchorSide => (c.y === 0 ? 'n' : c.y === 1 ? 's' : c.x === 1 ? 'e' : 'w');

/**
 * Répartition du moteur, appliquée jusqu'à ce qu'elle ne change plus rien (les coudes d'une boucle servent de
 * référence à ses bouts) ; coudes des boucles recalculés à chaque passe, comme l'appli les écrit.
 */
function build(): string {
  const ends: Ends = new Map();
  for (let pass = 0; pass < 10; pass++) {
    const page = readDrawio(xml(ends)).document.pages[0]!;
    const changes = distributeAnchors(page, new Set(page.shapes.map((s) => s.id)));
    if (pass > 0 && changes.length === 0) break;
    for (const edge of page.edges) {
      const current = {
        exit: { x: Number(edge.style.exitX), y: Number(edge.style.exitY) },
        entry: { x: Number(edge.style.entryX), y: Number(edge.style.entryY) },
        points: [] as Point[],
      };
      for (const change of changes.filter((ch) => ch.edgeId === edge.id))
        current[change.end === 'source' ? 'exit' : 'entry'] = change.constraint;
      ends.set(edge.id, current);
    }
  }
  // Tracés qui contournent les formes et les autres flèches (une boucle sans tracé garde ses coudes par défaut).
  const page = readDrawio(xml(ends)).document.pages[0]!;
  const routes = avoidRoutes(page, new Set(page.edges.map((e) => e.id)));
  for (const edge of page.edges) {
    const current = ends.get(edge.id)!;
    const loop = edge.sourceId === edge.targetId ? page.shapes.find((s) => s.id === edge.sourceId) : undefined;
    const routed = routes.get(edge.id);
    if (routed) current.points = routed;
    else if (loop) {
      const b = loop.bounds;
      const at = (c: Point) => ({ point: { x: b.x + c.x * b.width, y: b.y + c.y * b.height }, side: sideOf(c) });
      current.points = loopWaypoints(b, at(current.exit), at(current.entry));
    }
  }
  return xml(ends);
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

describe('fixture anchor-auto-routing.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../../fixtures/anchor-auto-routing.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('anchor-auto-routing.drawio'));
  });

  it('page en ancrage automatique, répartition stable', () => {
    const page = readDrawio(fixture('anchor-auto-routing.drawio')).document.pages[0]!;
    expect(page.attributes['spatial.anchoring']).toBe('auto');
    expect(distributeAnchors(page, new Set(page.shapes.map((s) => s.id)))).toEqual([]);
  });

  it('aucun tracé ne traverse une forme ni ne se superpose à un autre', () => {
    const page = readDrawio(fixture('anchor-auto-routing.drawio')).document.pages[0]!;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const routes = new Map(page.edges.map((e) => [e.id, routeOf(page, shapes, e.id)]));
    const enters = (a: Point, b: Point, r: { x: number; y: number; width: number; height: number }) =>
      Math.max(a.x, b.x) > r.x &&
      Math.min(a.x, b.x) < r.x + r.width &&
      Math.max(a.y, b.y) > r.y &&
      Math.min(a.y, b.y) < r.y + r.height;
    for (const [id, route] of routes) {
      expect(routes.get(id)!.length, id).toBeGreaterThan(1);
      // Les bouts partent de leurs formes : le premier et le dernier segment n'en traversent pas d'autre.
      for (let n = 0; n + 1 < route.length; n++)
        for (const shape of page.shapes) {
          if (n === 0 && shape.id === page.edges.find((e) => e.id === id)!.sourceId) continue;
          if (n === route.length - 2 && shape.id === page.edges.find((e) => e.id === id)!.targetId) continue;
          expect(
            enters(route[n]!, route[n + 1]!, shape.bounds),
            `${id} traverse ${shape.id} : ${JSON.stringify(route)}`,
          ).toBe(false);
        }
    }
    const segments = [...routes].flatMap(([id, route]) => segmentsOf(route).map((s) => ({ id, s })));
    for (const { id, s } of segments)
      for (const other of segments) {
        if (other.id <= id) continue;
        const vertical = s.a.x === s.b.x;
        if (vertical !== (other.s.a.x === other.s.b.x)) continue;
        if (vertical ? s.a.x !== other.s.a.x : s.a.y !== other.s.a.y) continue;
        const [a0, a1] = vertical ? [s.a.y, s.b.y].sort((x, y) => x - y) : [s.a.x, s.b.x].sort((x, y) => x - y);
        const [b0, b1] = vertical
          ? [other.s.a.y, other.s.b.y].sort((x, y) => x - y)
          : [other.s.a.x, other.s.b.x].sort((x, y) => x - y);
        expect(Math.min(a1!, b1!) - Math.max(a0!, b0!), `${id} et ${other.id} se superposent`).toBeLessThanOrEqual(0);
      }
  });

  it('aucun croisement entre deux tracés', () => {
    const page = readDrawio(fixture('anchor-auto-routing.drawio')).document.pages[0]!;
    const shapes = new Map(page.shapes.map((s) => [s.id, s]));
    const segments = page.edges.flatMap((e) => segmentsOf(routeOf(page, shapes, e.id)).map((s) => ({ id: e.id, s })));
    const crossings: string[] = [];
    for (const { id, s } of segments)
      for (const other of segments) {
        if (other.id <= id) continue;
        const [v, h] = s.a.x === s.b.x ? [s, other.s] : [other.s, s];
        if (v.a.x !== v.b.x || h.a.y !== h.b.y) continue;
        const x = v.a.x;
        const y = h.a.y;
        if (
          x > Math.min(h.a.x, h.b.x) &&
          x < Math.max(h.a.x, h.b.x) &&
          y > Math.min(v.a.y, v.b.y) &&
          y < Math.max(v.a.y, v.b.y)
        )
          crossings.push(`${id} × ${other.id}`);
      }
    expect(crossings).toEqual([]);
  });

  it('n flèches sur un côté : à 1/(n+1), 2/(n+1)…', () => {
    const page = readDrawio(fixture('anchor-auto-routing.drawio')).document.pages[0]!;
    // Éventail de 5 sur le haut (cas 4) : arrivées à 1/6 … 5/6, rangées de gauche à droite.
    const entries = page.edges
      .filter((e) => e.id.startsWith('e4_'))
      .map((e) => Number(e.style.entryX))
      .sort((a, b) => a - b);
    expect(entries).toEqual([0.1667, 0.3333, 0.5, 0.6667, 0.8333]);
  });
});

const SVG = fileURLToPath(new URL('../../../../fixtures/drawio-saved/anchor-auto-routing.svg', import.meta.url));

describe.runIf(existsSync(SVG))('anchor-auto-routing.drawio : même tracé que draw.io (export SVG)', () => {
  // Lus au premier test : la fixture peut être en cours de régénération (`WRITE_FIXTURES=1`).
  let loaded: { page: PageModel; routes: Map<string, Point[]>; shapes: Map<string, ShapeModel> } | undefined;
  const load = () => {
    if (loaded) return loaded;
    const page = readDrawio(fixture('anchor-auto-routing.drawio')).document.pages[0]!;
    const first = page.shapes.find((s) => s.id === shapeId(0, 'h'))!.bounds;
    const routes = drawioSvgRoutes(
      fixture('drawio-saved/anchor-auto-routing.svg'),
      { id: shapeId(0, 'h'), x: first.x, y: first.y },
      (id) => /^e\d+_\d+$/.test(id),
    );
    loaded = { page, routes, shapes: new Map(page.shapes.map((s) => [s.id, s])) };
    return loaded;
  };
  const near = (a: Point, b: Point) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

  cases().forEach((c, i) =>
    c.links.forEach((_, k) => {
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
