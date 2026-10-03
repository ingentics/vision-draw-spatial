import { describe, expect, it } from 'vitest';
import {
  applyEndAttachment,
  connectionPoints,
  constraintStyle,
  endAttachmentOf,
  restoreEnds,
  sameAttachment,
  snapshotEnds,
} from '../../../src/engine/edit/edgeEnds';
import { setCellStyleValue, setEdgeTerminal } from '../../../src/engine/format/edit';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';
import { routeEdge } from '../../../src/engine/render/edges/route';

const FILE =
  '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="a" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="b" vertex="1" parent="1"><mxGeometry x="300" y="200" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="g" vertex="1" parent="1" style="group"><mxGeometry x="500" y="500" width="10" height="10" as="geometry"/></mxCell>' +
  '<mxCell id="e" edge="1" parent="1" source="a" target="b" style="edgeStyle=orthogonalEdgeStyle;">' +
  '<mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="f" edge="1" parent="g" source="a" style=""><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '</root></mxGraphModel></diagram></mxfile>';

function load() {
  const { document, tree } = readDrawio(FILE);
  return { page: document.pages[0]!, pageTree: tree.pages[0]!, tree };
}

describe('points de connexion', () => {
  it('milieux des quatre côtés', () => {
    expect(connectionPoints({ x: 10, y: 20, width: 100, height: 60 })).toEqual([
      { x: 60, y: 20 },
      { x: 110, y: 50 },
      { x: 60, y: 80 },
      { x: 10, y: 50 },
    ]);
  });
});

describe('attache des bouts', () => {
  it('lit auto, fixe et libre', () => {
    const { page } = load();
    const edge = page.edges.find((e) => e.id === 'e')!;
    expect(endAttachmentOf(edge, 'source')).toEqual({ kind: 'floating', shapeId: 'a' });
    applyEndAttachment(edge, 'target', { kind: 'fixed', shapeId: 'b', constraint: { x: 0, y: 0.5 } });
    expect(endAttachmentOf(edge, 'target')).toEqual({ kind: 'fixed', shapeId: 'b', constraint: { x: 0, y: 0.5 } });
    applyEndAttachment(edge, 'source', { kind: 'free', point: { x: -50, y: 30 } });
    expect(endAttachmentOf(edge, 'source')).toEqual({ kind: 'free', point: { x: -50, y: 30 } });
  });

  it("le tracé suit l'attache fixe, et revient à l'auto", () => {
    const { page } = load();
    const edge = page.edges.find((e) => e.id === 'e')!;
    const [a, b] = page.shapes;
    const route = () =>
      routeEdge({
        source: edge.sourceId ? { bounds: a!.bounds, perimeter: 'rectangle' } : undefined,
        target: { bounds: b!.bounds, perimeter: 'rectangle' },
        sourcePoint: edge.sourcePoint,
        waypoints: edge.points,
        style: edge.style,
      });
    const snapshot = snapshotEnds(edge);
    applyEndAttachment(edge, 'target', { kind: 'fixed', shapeId: 'b', constraint: { x: 0.5, y: 0 } });
    expect(route().at(-1)).toEqual({ x: 350, y: 200 });
    applyEndAttachment(edge, 'target', { kind: 'floating', shapeId: 'b' });
    expect(edge.style.entryX).toBeUndefined();
    restoreEnds(edge, snapshot);
    expect(edge.style).toEqual({ edgeStyle: 'orthogonalEdgeStyle' });
  });

  it('compare deux attaches', () => {
    expect(sameAttachment({ kind: 'floating', shapeId: 'a' }, { kind: 'floating', shapeId: 'a' })).toBe(true);
    expect(
      sameAttachment({ kind: 'floating', shapeId: 'a' }, { kind: 'fixed', shapeId: 'a', constraint: { x: 1, y: 0.5 } }),
    ).toBe(false);
    expect(sameAttachment({ kind: 'free', point: { x: 1, y: 2 } }, { kind: 'free', point: { x: 1, y: 2 } })).toBe(true);
    expect(sameAttachment(undefined, { kind: 'floating', shapeId: 'a' })).toBe(false);
  });
});

describe('écriture des bouts (setEdgeTerminal)', () => {
  it('point fixe : clés entry… écrites comme draw.io', () => {
    const { pageTree, tree } = load();
    setEdgeTerminal(pageTree, 'e', 'target', { cellId: 'b' });
    for (const [key, value] of Object.entries(constraintStyle('target', { x: 1, y: 0.5 })))
      setCellStyleValue(pageTree, 'e', key, value);
    const written = writeDrawio(tree);
    expect(written).toContain('style="edgeStyle=orthogonalEdgeStyle;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"');
    const edge = readDrawio(written).document.pages[0]!.edges.find((e) => e.id === 'e')!;
    expect(edge.targetId).toBe('b');
    expect(endAttachmentOf(edge, 'target')).toEqual({ kind: 'fixed', shapeId: 'b', constraint: { x: 1, y: 0.5 } });
  });

  it('extrémité libre : attribut retiré, point dans la géométrie', () => {
    const { pageTree, tree } = load();
    setEdgeTerminal(pageTree, 'e', 'source', { point: { x: -40, y: 30 } });
    const written = writeDrawio(tree);
    expect(written).toContain('<mxGeometry relative="1" as="geometry"><mxPoint as="sourcePoint" x="-40" y="30"/>');
    const edge = readDrawio(written).document.pages[0]!.edges.find((e) => e.id === 'e')!;
    expect(edge.sourceId).toBeUndefined();
    expect(edge.sourcePoint).toEqual({ x: -40, y: 30 });
  });

  it('point libre déjà écrit : remplacé, et relu dans le repère du parent', () => {
    const { pageTree, tree } = load();
    setEdgeTerminal(pageTree, 'f', 'target', { point: { x: 10, y: 0 } });
    setEdgeTerminal(pageTree, 'f', 'target', { point: { x: 20, y: 5 } });
    const written = writeDrawio(tree);
    expect(written.match(/as="targetPoint"/g)).toHaveLength(1);
    const edge = readDrawio(written).document.pages[0]!.edges.find((e) => e.id === 'f')!;
    expect(edge.targetPoint).toEqual({ x: 520, y: 505 });
  });

  it('attache sur une forme : point libre conservé (ignoré par draw.io)', () => {
    const { pageTree, tree } = load();
    setEdgeTerminal(pageTree, 'e', 'source', { point: { x: 1, y: 2 } });
    setEdgeTerminal(pageTree, 'e', 'source', { cellId: 'a' });
    const edge = readDrawio(writeDrawio(tree)).document.pages[0]!.edges.find((e) => e.id === 'e')!;
    expect(edge.sourceId).toBe('a');
  });

  it('cellule inconnue : erreur', () => {
    const { pageTree } = load();
    expect(() => setEdgeTerminal(pageTree, 'e', 'source', { cellId: 'zz' })).toThrow();
  });
});
