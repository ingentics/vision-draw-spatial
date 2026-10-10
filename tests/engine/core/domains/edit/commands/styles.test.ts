import { describe, expect, it } from 'vitest';
import { StyleCommands } from '../../../../../../src/engine/core/domains/edit/commands/styles';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { documentFromTree, readDrawio } from '../../../../../../src/engine/core/format/parse';
import { createDefaultRegistry } from '../../../../../../src/engine/plugins';
import { liveCore } from './liveCore';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="e" value="texte" style="edgeStyle=none;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="200" y="0" as="targetPoint"/></mxGeometry></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

const KEY = 'spatial.labelFollowShift';

describe('réglage en direct du texte d’une flèche (sujet 376)', () => {
  it('décalage tapé au fil des frappes sur un modèle gelé : le fichier et le modèle suivent, une seule étape', () => {
    const { core, page, reread, changes, undoSteps } = liveCore(XML);
    const commands = new StyleCommands(core);
    expect(Object.isFrozen(page())).toBe(true);
    for (const value of ['1', '12', '-12'])
      commands.setElementsStyle(['e'], { [KEY]: value }, 'Style', 'followShift:e:0');
    expect(page().edges[0]!.style[KEY]).toBe('-12');
    expect(reread().edges[0]!.style[KEY]).toBe('-12');
    expect(Object.isFrozen(page())).toBe(true);
    expect(changes.at(-1)!.pages[0]).toBe(page());
    const steps = undoSteps();
    expect(steps).toHaveLength(1);
    expect(steps[0]!.pages[0]!.edges[0]!.style[KEY]).toBeUndefined();
  });
});

describe('style de la palette sur une forme sans style à choisir (sujet 440)', () => {
  const SHAPES = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="box" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="40" height="40" as="geometry"/></mxCell>
<mxCell id="start" value="" style="ellipse;fillColor=#000000;spatial.kind=states-initial;" vertex="1" parent="1"><mxGeometry x="100" y="0" width="20" height="20" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

  it('la forme garde ses couleurs, les autres de la sélection prennent le style', () => {
    const { tree } = readDrawio(SHAPES);
    const state = { page: documentFromTree(tree).pages[0]! };
    // Cœur réduit : une page, un registre réel ; la page est relue à chaque modification.
    const core = {
      targets: { editablePage: () => ({ page: state.page, pageTree: tree.pages[0]! }) },
      file: {
        xmlTree: tree,
        documentChanged: () => {
          state.page = documentFromTree(tree).pages[0]!;
        },
      },
      registry: createDefaultRegistry(),
      edits: { recordSnapshot: () => {} },
    } as unknown as EngineCore;
    new StyleCommands(core).applyStylePreset(['box', 'start'], {
      name: 'Bleu',
      fillColor: '#dae8fc',
      strokeColor: '#6c8ebf',
    });
    const shape = (id: string) => state.page.shapes.find((s) => s.id === id)!;
    expect(shape('box').style.fillColor).toBe('#dae8fc');
    expect(shape('start').style.fillColor).toBe('#000000');
  });
});
