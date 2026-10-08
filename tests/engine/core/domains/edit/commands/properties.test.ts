import { describe, expect, it } from 'vitest';
import { PropertyEdits } from '../../../../../../src/engine/core/domains/edit/commands/properties';
import { liveCore } from './liveCore';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="task" value="" style="shape=internalStorage;spatial.kind=background-task;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe('réglage en direct d’un attribut spatial (sujet 376)', () => {
  it('étiquette tapée au fil des frappes sur un modèle gelé : le fichier et le modèle suivent, une seule étape', () => {
    const { core, page, reread, changes, undoSteps } = liveCore(XML);
    const edits = new PropertyEdits(core);
    expect(Object.isFrozen(page())).toBe(true);
    for (const text of ['J', 'JO', 'JOB']) edits.setSpatial('task', 'spatial.tag', text, 'tag:task:0');
    expect(page().shapes[0]!.style['spatial.tag']).toBe('JOB');
    expect(reread().shapes[0]!.style['spatial.tag']).toBe('JOB');
    // La copie de travail est rendue à chaque frappe : la page du document reste gelée.
    expect(Object.isFrozen(page())).toBe(true);
    expect(changes.at(-1)!.pages[0]).toBe(page());
    const steps = undoSteps();
    expect(steps).toHaveLength(1);
    expect(steps[0]!.pages[0]!.shapes[0]!.style['spatial.tag']).toBeUndefined();
  });
});
