import { describe, expect, it } from 'vitest';
import { reverseEdgeCell, setCellStyleValue, setEdgePoints } from '../../../../src/engine/core/format/cellEdits';
import { constraintStyle } from '../../../../src/engine/core/edit/edgeEnds';
import { reversalFix } from '../../../../src/engine/core/edit/anchoring/reversal';
import { parseStyle } from '../../../../src/engine/core/format/style';
import type { PageModel, Point } from '../../../../src/engine/core/model/types';
import { shapesById } from '../../../../src/engine/core/model/pageIndex';
import { toTerminal } from '../../../../src/engine/core/render/edges/terminal';
import { routeEdge } from '../../../../src/engine/core/render/edges/route';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../src/engine/core/format/write';

// Étape 131 : inverser une flèche, comme « Inverser » de draw.io (Graph.turnShapes).

const file = (edge: string) => `<mxfile>
  <diagram id="p" name="P">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="a" parent="1" vertex="1"><mxGeometry width="40" height="40" as="geometry" /></mxCell>
        <mxCell id="b" parent="1" vertex="1"><mxGeometry x="200" width="40" height="40" as="geometry" /></mxCell>
${edge}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

function reverse(edge: string) {
  const { tree } = readDrawio(file(edge));
  reverseEdgeCell(tree.pages[0]!, 'e');
  return readDrawio(writeDrawio(tree)).document.pages[0]!.edges[0]!;
}

describe('reverseEdgeCell', () => {
  it('formes, points intermédiaires et points d’attache échangés ; les bouts restent en place', () => {
    const edge =
      reverse(`        <mxCell id="e" style="exitX=1;exitY=0.5;exitDx=2;entryX=0;entryY=0;sourcePerimeterSpacing=4;startArrow=oval;endArrow=diamond;" parent="1" source="a" target="b" edge="1">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="100" y="20" />
              <mxPoint x="100" y="80" />
            </Array>
          </mxGeometry>
        </mxCell>`);
    expect(edge.sourceId).toBe('b');
    expect(edge.targetId).toBe('a');
    expect(edge.points).toEqual([
      { x: 100, y: 80 },
      { x: 100, y: 20 },
    ]);
    expect(edge.style).toMatchObject({
      exitX: '0',
      exitY: '0',
      entryX: '1',
      entryY: '0.5',
      entryDx: '2',
      targetPerimeterSpacing: '4',
      startArrow: 'oval',
      endArrow: 'diamond',
    });
    expect(edge.style.exitDx).toBeUndefined();
    expect(edge.style.sourcePerimeterSpacing).toBeUndefined();
  });

  it('bouts libres : points de départ et d’arrivée échangés ; un seul bout libre change de côté', () => {
    const free = reverse(`        <mxCell id="e" parent="1" edge="1">
          <mxGeometry relative="1" as="geometry"><mxPoint x="10" y="20" as="sourcePoint" /><mxPoint x="300" y="40" as="targetPoint" /></mxGeometry>
        </mxCell>`);
    expect(free.sourcePoint).toEqual({ x: 300, y: 40 });
    expect(free.targetPoint).toEqual({ x: 10, y: 20 });
    const half = reverse(`        <mxCell id="e" parent="1" source="a" edge="1">
          <mxGeometry relative="1" as="geometry"><mxPoint x="300" y="40" as="targetPoint" /></mxGeometry>
        </mxCell>`);
    expect(half.sourceId).toBeUndefined();
    expect(half.targetId).toBe('a');
    expect(half.sourcePoint).toEqual({ x: 300, y: 40 });
  });
});

// Sujet 328 : inverser ne change que le sens, pas le tracé.
describe('reversalFix', () => {
  const cell = (attributes: string, geometry = '') =>
    `        <mxCell id="e" ${attributes} parent="1" edge="1"><mxGeometry relative="1" as="geometry">${geometry}</mxGeometry></mxCell>`;
  const place = (edge: string) =>
    file(edge)
      .replace(
        '<mxGeometry width="40" height="40" as="geometry" />',
        '<mxGeometry width="80" height="40" as="geometry" />',
      )
      .replace(
        '<mxGeometry x="200" width="40" height="40" as="geometry" />',
        '<mxGeometry x="200" y="150" width="80" height="40" as="geometry" />',
      );
  const routeOf = (page: PageModel) => {
    const shapes = shapesById(page);
    const e = page.edges[0]!;
    return routeEdge({
      source: toTerminal(shapes.get(e.sourceId ?? '')),
      target: toTerminal(shapes.get(e.targetId ?? '')),
      sourcePoint: e.sourcePoint,
      targetPoint: e.targetPoint,
      waypoints: e.points,
      style: e.style,
    });
  };
  /** Inverse comme la commande « Inverser » : sens, puis corrections du tracé. */
  function reversed(xml: string) {
    const { tree } = readDrawio(xml);
    const page = tree.pages[0]!;
    reverseEdgeCell(page, 'e');
    const style = parseStyle(page.cells.get('e')?.cell?.getAttribute('style')).values;
    const fix = reversalFix(readDrawio(xml).document.pages[0]!, 'e', style);
    for (const [end, constraint] of Object.entries(fix?.pins ?? {}) as Array<['source' | 'target', Point]>)
      for (const [key, value] of Object.entries(constraintStyle(end, constraint)))
        if (value !== undefined) setCellStyleValue(page, 'e', key, value);
    if (fix?.points) setEdgePoints(page, 'e', fix.points);
    return { fix, after: routeOf(readDrawio(writeDrawio(tree)).document.pages[0]!) };
  }
  const same = (xml: string) => {
    const result = reversed(xml);
    const expected = [...routeOf(readDrawio(xml).document.pages[0]!)].reverse();
    // Au demi-pixel près : le routeur décale d'un demi-pixel le coude d'une flèche à bouts libres sans point.
    expect(result.after).toHaveLength(expected.length);
    result.after.forEach((p, i) => {
      expect(Math.abs(p.x - expected[i]!.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(p.y - expected[i]!.y)).toBeLessThanOrEqual(0.5);
    });
    return result;
  };
  const ORTH = 'edgeStyle=orthogonalEdgeStyle;rounded=1;';

  it('angles droits, bouts flottants sur deux formes : points d’attache fixés', () => {
    const { fix } = same(place(cell(`style="${ORTH}" source="a" target="b"`)));
    expect(fix?.pins.source).toBeDefined();
    expect(fix?.pins.target).toBeDefined();
  });

  it('points d’attache déjà posés : rien à corriger', () => {
    const { fix } = same(place(cell(`style="${ORTH}exitX=1;exitY=0.5;entryX=0;entryY=0.5;" source="a" target="b"`)));
    expect(fix).toBeUndefined();
  });

  it('deux bouts libres : le tracé est gardé', () => {
    same(
      place(
        cell(
          `style="${ORTH}"`,
          '<mxPoint x="400" y="20" as="sourcePoint" /><mxPoint x="30" y="200" as="targetPoint" />',
        ),
      ),
    );
  });

  it('un bout libre, l’autre sur une forme : le tracé est gardé', () => {
    same(place(cell(`style="${ORTH}" source="a"`, '<mxPoint x="400" y="200" as="targetPoint" />')));
    same(place(cell(`style="${ORTH}" target="b"`, '<mxPoint x="20" y="-100" as="sourcePoint" />')));
  });
});
