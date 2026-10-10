import { describe, expect, it } from 'vitest';
import { EdgeEndDrags } from '../../../../../../src/engine/core/domains/edit/drag/edgeEnd';
import type { EdgeEndDrag } from '../../../../../../src/engine/core/domains/edit/drag/types';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { applyEndAttachment, snapshotEnds } from '../../../../../../src/engine/core/edit/edgeEnds';
import type { EndAttachment } from '../../../../../../src/engine/core/edit/edgeEnds';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../../src/engine/core/format/write';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="c" value="C" vertex="1" parent="1"><mxGeometry x="300" y="200" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/**
 * Bout d'arrivée de `e` lâché sur `attachment`, sur une page dont le mode impose (ou non) des bouts attachés : cœur
 * réduit à ce que le lâcher utilise ; `edits` : étapes d'annulation ouvertes.
 */
function release(attachment: EndAttachment, attachedEnds: boolean) {
  const { document, tree } = readDrawio(XML);
  const page = document.pages[0]!;
  const edits: string[] = [];
  const core = {
    pages: { pageById: () => page, getCurrentPage: () => page },
    pageModes: { attachedEnds: () => attachedEnds },
    edits: { recordEdit: (label: string) => edits.push(label) },
    live: { retraceEdges: () => {}, afterLiveEdit: () => {} },
    anchors: { loopPoints: () => undefined },
    edgePoints: { writeEdgePoints: () => {} },
    modeFollowUps: { edgeReconnected: () => {} },
    file: { documentChanged: () => {} },
  } as unknown as EngineCore;
  const edge = page.edges[0]!;
  const drag: EdgeEndDrag = {
    kind: 'edgeEnd',
    pageId: page.id,
    edgeId: edge.id,
    end: 'target',
    original: snapshotEnds(edge),
    originalPoints: [],
    attachment,
    started: true,
  };
  // Aperçu du glisser : le bout suit déjà le pointeur sur la copie de travail.
  applyEndAttachment(edge, 'target', attachment);
  const before = writeDrawio(tree);
  new EdgeEndDrags(core).commit(drag, tree.pages[0]!);
  return { edge, edits, unchanged: writeDrawio(tree) === before };
}

describe('bout de flèche rebranché sur une page aux bouts attachés (sujet 438)', () => {
  const free: EndAttachment = { kind: 'free', point: { x: 600, y: 30 } };
  const onC: EndAttachment = { kind: 'floating', shapeId: 'c' };

  it('lâché dans le vide : le bout revient sur sa forme, rien d’écrit, pas d’étape d’annulation', () => {
    const { edge, edits, unchanged } = release(free, true);
    expect(edge.targetId).toBe('b');
    expect(edge.targetPoint).toBeUndefined();
    expect(unchanged).toBe(true);
    expect(edits).toEqual([]);
  });

  it('lâché sur une autre forme : rebranché comme d’habitude', () => {
    const { edits, unchanged } = release(onC, true);
    expect(unchanged).toBe(false);
    expect(edits).toEqual(['Extrémité de flèche']);
  });

  it('sans la règle : le bout libre est écrit comme avant', () => {
    const { edge, edits, unchanged } = release(free, false);
    expect(edge.targetId).toBeUndefined();
    expect(unchanged).toBe(false);
    expect(edits).toEqual(['Extrémité de flèche']);
  });
});
