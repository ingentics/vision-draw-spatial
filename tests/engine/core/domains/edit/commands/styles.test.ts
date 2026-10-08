import { describe, expect, it } from 'vitest';
import { StyleCommands } from '../../../../../../src/engine/core/domains/edit/commands/styles';
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
