import { describe, expect, it, vi } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { EditHistory } from '../../../../../src/engine/core/domains/document/undo';
import { EditTargets } from '../../../../../src/engine/core/domains/edit/targets';
import { PointerInput } from '../../../../../src/engine/core/domains/input/pointerInput';
import { Simulations } from '../../../../../src/engine/core/domains/modes/simulations';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { SimulationHandlers } from '../../../../../src/engine/core/modes/simulation';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="f" edge="1" source="b" target="a" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/**
 * Cœur réduit à ce que la simulation, les gardes d'édition, l'annulation et le clic lisent ; sans scène (rien n'est
 * dessiné). `picked` : élément sous le pointeur.
 */
function setup(picked?: string) {
  const { document, tree } = readDrawio(XML);
  const page = document.pages[0]!;
  const events: unknown[] = [];
  const clearSelection = vi.fn();
  const selectItems = vi.fn();
  const restore = vi.fn();
  const core = {
    pages: { getCurrentPage: () => page, pageById: () => page, currentPageId: page.id },
    graph: { isGraph: () => false },
    canInteract: () => true,
    gesture: { endMove: vi.fn() },
    labelEditor: { closeLabelEdit: vi.fn() },
    selection: { clearSelection, selectItems, select: selectItems },
    events: { emit: (_name: string, session: unknown) => events.push(session) },
    rendering: { requestRender: vi.fn() },
    scenes: { current: undefined },
    config: { reducedMotion: () => true },
    picking: {
      pickAt: () => {
        const edge = page.edges.find((e) => e.id === picked);
        return edge && { type: 'edge', element: edge };
      },
    },
    modeHandles: { click: () => false },
    projection: { groundPointAtHeight: () => ({ x: 0, y: 0 }) },
    file: { pageTreeOf: () => tree.pages[0], xmlTree: tree, restore },
  } as unknown as EngineCore;
  const simulations = new Simulations(core);
  const targets = new EditTargets(core, true);
  Object.assign(core, { simulations, targets });
  return { core, page, simulations, targets, events, clearSelection, selectItems, restore };
}

describe('simulation d’un mode (sujet 461)', () => {
  it('ouverture : sélection vidée, session gardée et signalée ; fermeture : rendue à celui qui l’a ouverte', () => {
    const { simulations, events, clearSelection } = setup();
    const owner = {};
    const closed = vi.fn();
    expect(simulations.open(owner, { closed })).toBe(true);
    expect(clearSelection).toHaveBeenCalled();
    expect(simulations.current).toEqual({ pageId: 'p', owner });
    simulations.close();
    expect(simulations.current).toBeUndefined();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(events).toEqual([{ pageId: 'p', owner }, undefined]);
  });

  it('Échap ferme la simulation ; les autres touches vont au mode', () => {
    const { simulations } = setup();
    const keys: string[] = [];
    simulations.open({}, { key: (key) => (keys.push(key), key === '1') });
    expect(simulations.key('1')).toBe(true);
    expect(simulations.key('x')).toBe(false);
    expect(keys).toEqual(['1', 'x']);
    expect(simulations.key('Escape')).toBe(true);
    expect(simulations.current).toBeUndefined();
    expect(simulations.key('1')).toBe(false);
  });

  it('changer de page ou de fichier ferme la simulation', () => {
    const { simulations } = setup();
    const closed = vi.fn();
    simulations.open({}, { closed });
    simulations.pageShown('p');
    expect(simulations.current).toBeDefined();
    simulations.pageShown('autre');
    expect(simulations.current).toBeUndefined();
    simulations.open({}, { closed });
    simulations.resetDocument();
    expect(simulations.current).toBeUndefined();
    expect(closed).toHaveBeenCalledTimes(2);
  });

  it('clic : l’élément sous le pointeur est rendu au mode, rien n’est sélectionné', () => {
    const clicks: string[] = [];
    const handlers: SimulationHandlers = { click: (id) => clicks.push(id) };
    const { core, simulations, selectItems } = setup('e');
    simulations.open({}, handlers);
    simulations.show({ kept: ['a'] });
    new PointerInput(core).handleClick({ x: 0, y: 0 });
    expect(clicks).toEqual(['e']);
    expect(selectItems).not.toHaveBeenCalled();
    // Sans simulation, le clic sélectionne de nouveau.
    simulations.close();
    expect(simulations.click({ x: 0, y: 0 })).toBe(false);
  });

  it('édition refusée pendant la simulation : page non modifiable (gestes, palette, touches), ni annuler ni rétablir', () => {
    const { core, simulations, targets, restore } = setup();
    const edits = new EditHistory(core);
    Object.assign(core, { edits });
    edits.recordEdit('Avant');
    expect(targets.editablePage()).toBeDefined();
    expect(edits.canUndo()).toBe(true);
    simulations.open({}, {});
    expect(targets.canEditNow()).toBe(false);
    expect(targets.editablePage()).toBeUndefined();
    expect(targets.writablePage()).toBeUndefined();
    expect(targets.editablePageById('p')).toBeUndefined();
    expect(edits.canUndo()).toBe(false);
    edits.undo();
    expect(restore).not.toHaveBeenCalled();
    simulations.close();
    expect(targets.editablePage()).toBeDefined();
  });
});
