import { describe, expect, it } from 'vitest';
import { MoveDrags } from '../../../../../../src/engine/core/domains/edit/drag/move';
import type { MoveDrag } from '../../../../../../src/engine/core/domains/edit/drag/types';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { movePlan } from '../../../../../../src/engine/core/edit/movePlan';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { Rect, ShapeModel } from '../../../../../../src/engine/core/model/types';

/** Deux formes côte à côte : `a` glissée, `b` proposée par le mode pour l'échange (`bStyle` : son style). */
const cells = (bStyle: string) => `<mxfile><diagram id="p" name="P"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="100" as="geometry"/></mxCell>
<mxCell id="b" value="B" style="${bStyle}" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="100" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/**
 * `a` glissée jusqu'au centre de `b` puis lâchée, le mode proposant `b` pour l'échange : cœur réduit à ce que le
 * déplacement utilise. Renvoie l'échange retenu, les bornes écrites et ce que le mode a reçu à la pose.
 */
function dropOnto(bStyle: string) {
  const { document, tree } = readDrawio(cells(bStyle));
  const page = document.pages[0]!;
  const pageTree = tree.pages[0]!;
  const steps: string[] = [];
  let placed: { ids: string[]; before: Array<Rect | undefined> } | undefined;
  const core = {
    camera: { state: { zoom: 1 } },
    selection: { select: () => undefined },
    edgeHandles: { edgeEndPoints: () => undefined },
    live: { retraceEdges: () => undefined, translateObjects: () => undefined, afterLiveEdit: () => undefined },
    arrangement: { previewDistribution: () => new Set() },
    preview: { clearPlaces: () => undefined, showPlaces: () => undefined, clearLimits: () => undefined },
    pageModes: { dragPlaces: () => ({ places: [], swapWith: 'b' }) },
    file: { pageTreeOf: () => pageTree, documentChanged: () => undefined },
    pages: { pageById: () => readDrawio(cells(bStyle)).document.pages[0] },
    edits: { recordEdit: (label: string) => steps.push(label) },
    modeFollowUps: {
      shapesPlaced: (_pageId: string, ids: string[], previous?: (shape: ShapeModel) => Rect | undefined) => {
        placed = { ids, before: ids.map((id) => previous?.(page.shapes.find((s) => s.id === id)!)) };
        return false;
      },
    },
  } as unknown as EngineCore;
  const drag: MoveDrag = {
    kind: 'move',
    pageId: page.id,
    ...movePlan(page, pageTree, ['a'], [], [], () => undefined),
    detached: false,
    start: { x: 50, y: 50 },
    origin: { x: 0, y: 0, width: 100, height: 100 },
    applied: { x: 0, y: 0 },
    grid: 0,
    places: true,
    started: false,
  };
  const moves = new MoveDrags(core);
  moves.follow(page, drag, { x: 350, y: 50 }, true);
  const swapWith = drag.swapWith;
  moves.commit(drag, pageTree);
  const bounds = (id: string) => {
    const geometry = pageTree.cells.get(id)!.geometry!;
    return { x: Number(geometry.getAttribute('x')), y: Number(geometry.getAttribute('y')) };
  };
  return { swapWith, steps, placed, a: bounds('a'), b: bounds('b') };
}

describe('échange de place au lâcher (sujets 481, 501)', () => {
  it('les deux formes échangent leur place, en une étape ; le mode reçoit leurs bornes d’avant', () => {
    const result = dropOnto('');
    expect(result.swapWith).toBe('b');
    expect(result.steps).toEqual(['Échange de place']);
    expect(result.a).toEqual({ x: 300, y: 0 });
    expect(result.b).toEqual({ x: 0, y: 0 });
    expect(result.placed?.ids).toEqual(['a', 'b']);
    expect(result.placed?.before).toEqual([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 300, y: 0, width: 100, height: 100 },
    ]);
  });

  it.each(['locked=1;', 'movable=0;'])('une forme %s n’est jamais échangée', (style) => {
    const result = dropOnto(style);
    expect(result.swapWith).toBeUndefined();
    expect(result.steps).toEqual(['Déplacement']);
    expect(result.b).toEqual({ x: 300, y: 0 });
  });
});
