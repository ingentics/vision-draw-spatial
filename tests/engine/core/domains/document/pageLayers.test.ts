import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageLayers } from '../../../../../src/engine/core/domains/document/pageLayers';
import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import type { DocumentModel } from '../../../../../src/engine/core/model/types';

// Sujet 523 : calques des pages, calque courant et opérations annulables.

/** Page normale `p` (calques 1 et L2), page `s` d'un mode sans calques, page `c` d'un mode qui les active. */
const XML = `<mxfile>
<diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
<mxCell id="L2" value="Haut" parent="0"/>
<mxCell id="b" vertex="1" parent="L2"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>
<diagram id="s" name="S" spatial.mode="sobre"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram>
<diagram id="c" name="C" spatial.mode="calques"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram>
</mxfile>`;

function setup() {
  const { document: loaded, tree } = readDrawio(XML);
  const state = { document: loaded as DocumentModel, edits: [] as string[], events: [] as unknown[][], removed: 0 };
  const page = (id: string) => state.document.pages.find((p) => p.id === id)!;
  const modes = new PageModeRegistry()
    .register({ id: 'sobre', namespace: 'sobre', name: 'Sobre' })
    .register({ id: 'calques', namespace: 'calques', name: 'Calques', page: { layers: true } });
  const core = {
    modes,
    pages: { pageById: page },
    graph: { isGraph: () => false },
    scenes: { current: undefined },
    layerSpreads: { isFlattened: () => false },
    gesture: { endMove: () => {} },
    selection: { current: undefined as unknown },
    targets: {
      editablePageById: (id: string) => {
        const index = state.document.pages.findIndex((p) => p.id === id);
        return { page: state.document.pages[index]!, pageTree: tree.pages[index]!, xmlTree: tree };
      },
    },
    edits: { recordSnapshot: (label: string) => state.edits.push(label) },
    modeFollowUps: { elementsRemoved: () => state.removed++ },
    file: { documentChanged: () => (state.document = documentFromTree(tree)) },
    events: { emit: (...args: unknown[]) => state.events.push(args) },
  } as unknown as EngineCore;
  const layers = new PageLayers(core);
  return { layers, state, page, core };
}

describe('calques des pages (sujet 523)', () => {
  it('une page sans mode a des calques, une page en mode seulement si le mode les active', () => {
    const { layers } = setup();
    expect(layers.view('p')?.layers.map((l) => l.id)).toEqual(['1', 'L2']);
    expect(layers.view('s')).toBeUndefined();
    expect(layers.view('c')?.current).toBe('1');
  });

  it('calque courant : le premier par défaut, choisi ensuite (événement), là où vont les créations', () => {
    const { layers, state, page } = setup();
    expect(layers.view('p')?.current).toBe('1');
    expect(layers.creationLayer(page('p'))).toBe('1');
    layers.setCurrent('p', 'L2');
    expect(layers.view('p')?.current).toBe('L2');
    expect(layers.creationLayer(page('p'))).toBe('L2');
    expect(state.events).toEqual([['layerChange', 'p']]);
    layers.setCurrent('p', 'inconnu');
    expect(state.events).toHaveLength(1);
  });

  it('page sans calques : les créations vont sur le premier calque', () => {
    const { layers, page } = setup();
    expect(layers.creationLayer(page('s'))).toBeUndefined();
  });

  it('nouveau document : calques courants oubliés', () => {
    const { layers } = setup();
    layers.setCurrent('p', 'L2');
    layers.resetDocument();
    expect(layers.view('p')?.current).toBe('1');
  });

  it('ajouter : une étape, le nouveau calque au-dessus devient courant', () => {
    const { layers, state, page } = setup();
    layers.addLayer('p');
    expect(state.edits).toEqual(['Nouveau calque']);
    expect(page('p').layers.map((l) => l.name)).toEqual(['', 'Haut', 'Calque 3']);
    expect(layers.view('p')?.current).toBe(page('p').layers[2]!.id);
  });

  it('une opération sans effet n’enregistre pas d’étape', () => {
    const { layers, state } = setup();
    layers.renameLayer('p', 'L2', ' Haut ');
    layers.setLayerVisible('p', 'L2', true);
    layers.setLayerLocked('p', 'L2', false);
    layers.moveLayer('p', 'L2', 'up');
    layers.removeLayer('c', '1');
    expect(state.edits).toEqual([]);
  });

  it('supprimer : une étape, le mode remet en ordre ; le courant supprimé revient au premier', () => {
    const { layers, state, page } = setup();
    layers.setCurrent('p', 'L2');
    layers.removeLayer('p', 'L2');
    expect(state.edits).toEqual(['Calque supprimé']);
    expect(state.removed).toBe(1);
    expect(page('p').shapes.map((s) => s.id)).toEqual(['a']);
    expect(layers.view('p')?.current).toBe('1');
  });

  it('élévation (sujet 524) : une étape, rien si elle ne change pas', () => {
    const { layers, state, page } = setup();
    layers.setLayerElevation('p', 'L2', 0);
    expect(state.edits).toEqual([]);
    layers.setLayerElevation('p', 'L2', 24);
    expect(state.edits).toEqual(['Élévation du calque']);
    expect(page('p').layers[1]!.elevation).toBe(24);
  });

  it('rien sur une page sans calques', () => {
    const { layers, state, page } = setup();
    layers.addLayer('s');
    expect(state.edits).toEqual([]);
    expect(page('s').layers).toHaveLength(1);
  });

  it('changer la sélection de calque', () => {
    const { layers, state, page, core } = setup();
    (core.selection as { current: unknown }).current = {
      pageId: 'p',
      items: [{ type: 'shape', element: page('p').shapes[0] }],
    };
    layers.moveSelectionToLayer('L2');
    expect(state.edits).toEqual(['Changement de calque']);
    expect(page('p').shapes.find((s) => s.id === 'a')!.layerId).toBe('L2');
  });
});
