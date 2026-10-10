import { describe, expect, it } from 'vitest';
import { DragGesture } from '../../../../../../src/engine/core/domains/edit/drag/gesture';
import type { MoveDrag } from '../../../../../../src/engine/core/domains/edit/drag/types';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { PickedElement } from '../../../../../../src/engine/core/interaction/pick';

const ARROW = 'shape=flexArrow;orthogonalLoop=1;html=1;';
const cells = (arrowStyle: string) => `<mxfile><diagram id="p" name="P"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="arrow" style="${arrowStyle}" edge="1" parent="1"><mxGeometry relative="1" as="geometry">
<mxPoint x="80" y="70" as="sourcePoint"/><mxPoint x="180" y="70" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="line" style="html=1;" edge="1" parent="1"><mxGeometry relative="1" as="geometry">
<mxPoint x="80" y="200" as="sourcePoint"/><mxPoint x="180" y="200" as="targetPoint"/></mxGeometry></mxCell>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="300" y="40" width="120" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/**
 * Appui sur l'élément `grabbed` (le pick le renvoie), la sélection étant `selected` : cœur réduit à ce que la saisie
 * utilise ; `picks` : nombre de picks faits pour cet appui.
 */
function press(grabbed: string, selected: string[] = [], arrowStyle = ARROW) {
  const { document, tree } = readDrawio(cells(arrowStyle));
  const page = document.pages[0]!;
  const item = (id: string): PickedElement => {
    const shape = page.shapes.find((s) => s.id === id);
    return shape ? { type: 'shape', element: shape } : { type: 'edge', element: page.edges.find((e) => e.id === id)! };
  };
  let picks = 0;
  const core = {
    targets: { editablePage: () => ({ page, pageTree: tree.pages[0]! }) },
    camera: { state: { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 } },
    display: { viewport: { width: 0, height: 0 } },
    edgeHandles: {
      edgeEndAt: () => undefined,
      pointHandleAt: () => undefined,
      edgeEndPoints: (id: string) => {
        const edge = page.edges.find((e) => e.id === id)!;
        return { source: edge.sourcePoint!, target: edge.targetPoint! };
      },
    },
    shapeHandles: { handleAt: () => undefined },
    partDrags: { grab: () => undefined },
    picking: {
      pickAt: () => {
        picks++;
        return item(grabbed);
      },
    },
    selection: {
      current: selected.length > 0 ? { pageId: page.id, items: selected.map(item) } : undefined,
      isMultiSelection: () => selected.length > 1,
    },
    registry: { movesAsBlock: () => false },
    pageModes: {
      carried: () => [],
      obstacles: () => ({ rects: [] }),
      snapTargets: () => [],
      hasDragPlaces: () => false,
    },
  } as unknown as EngineCore;
  const gesture = new DragGesture(core);
  const started = gesture.beginMove({ x: 100, y: 70 });
  const drag = (gesture as unknown as { active?: { rootIds: string[]; edges: Array<{ id: string }> } }).active;
  return {
    started,
    picks,
    shapes: drag?.rootIds ?? [],
    edges: drag?.edges.map((edge) => edge.id) ?? [],
  };
}

describe('glisser d’une flèche pleine par son corps (sujet 424)', () => {
  it('seule : elle bouge seule, un seul pick pour l’appui', () => {
    expect(press('arrow')).toEqual({ started: true, picks: 1, shapes: [], edges: ['arrow'] });
  });

  it('dans une sélection multiple : les formes et flèches sélectionnées bougent avec elle', () => {
    const { shapes, edges } = press('arrow', ['arrow', 'a', 'line']);
    expect(shapes).toEqual(['a']);
    expect(edges.sort()).toEqual(['arrow', 'line']);
  });

  it('verrouillée, ou flèche ordinaire : rien ne se glisse', () => {
    expect(press('arrow', [], `${ARROW}locked=1;`).started).toBe(false);
    expect(press('line').started).toBe(false);
  });

  it('une forme saisie se glisse, avec la flèche pleine de la sélection multiple', () => {
    const { started, shapes, edges } = press('a', ['a', 'arrow']);
    expect(started).toBe(true);
    expect(shapes).toEqual(['a']);
    expect(edges).toEqual(['arrow']);
  });
});

describe('pas au clavier (sujets 477, 481, 506)', () => {
  it('ni aimantation ni places : le mode n’est pas consulté', () => {
    const { document, tree } = readDrawio(cells(ARROW));
    const page = document.pages[0]!;
    const shape = page.shapes.find((s) => s.id === 'a')!;
    let asked = 0;
    let followed: MoveDrag | undefined;
    const core = {
      targets: { editablePage: () => ({ page, pageTree: tree.pages[0]! }) },
      selection: { current: { pageId: page.id, items: [{ type: 'shape', element: shape }] } },
      registry: { movesAsBlock: () => false },
      pageModes: {
        carried: () => [],
        obstacles: () => undefined,
        snapTargets: () => {
          asked++;
          return [{ id: 'x', rect: { x: 0, y: 0, width: 10, height: 10 } }];
        },
        hasDragPlaces: () => true,
      },
      settings: { edit: { nudgeStep: 1, nudgeCoarseStep: 10 } },
      file: { livePage: () => page, settleLivePage: () => undefined },
      moveDrags: { follow: (_page: unknown, drag: MoveDrag) => (followed = drag) },
      preview: { clearConnectorPreview: () => undefined, clearLimits: () => undefined, clearPlaces: () => undefined },
    } as unknown as EngineCore;
    expect(new DragGesture(core).nudgeSelection({ x: 1, y: 0 }, false)).toBe(true);
    expect(asked).toBe(0);
    expect(followed?.snapping).toBeUndefined();
    expect(followed?.places).toBe(false);
  });
});
