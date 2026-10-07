import { describe, expect, it } from 'vitest';
import { reverseEdgeCell } from '../../../../src/engine/core/format/cellEdits';
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
