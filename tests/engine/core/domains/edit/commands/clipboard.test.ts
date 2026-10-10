import { describe, expect, it } from 'vitest';
import { Clipboard } from '../../../../../../src/engine/core/domains/edit/commands/clipboard';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { cellLabelValue } from '../../../../../../src/engine/core/format/cellEdits';
import type { LabelRewrite } from '../../../../../../src/engine/core/format/fileLabels';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';

const HEAD = '&lt;b&gt;T&lt;/b&gt;&lt;br&gt;';
const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="${HEAD}A" style="html=1;" vertex="1" parent="1"><mxGeometry width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;
const PASTED = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="x" value="${HEAD}X" style="html=1;" vertex="1" parent="1"><mxGeometry width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel>`;

/** Labels gardés par l'appli : l'en-tête `<b>T</b><br>` retiré, comme le ferait un mode (sujet 478). */
const stripHead: LabelRewrite = (_page, _shape, value) =>
  value.startsWith('<b>T</b><br>') ? value.slice('<b>T</b><br>'.length) : undefined;

describe('coller du XML venu d’ailleurs (sujet 503)', () => {
  it('les labels collés passent par le mode, comme à l’ouverture ; le reste de la page est intact', () => {
    const { document, tree } = readDrawio(XML);
    const page = document.pages[0]!;
    const pageTree = tree.pages[0]!;
    const core = {
      targets: { editablePage: () => ({ page, pageTree }) },
      gesture: { endMove: () => undefined },
      edits: { recordEdit: () => undefined },
      modes: { pasteKeys: () => [] },
      pageModes: {
        fileLabels: (_pages: unknown, direction: string) => (direction === 'import' ? stripHead : undefined),
      },
      modeFollowUps: { shapesPlaced: () => false },
      file: { documentChanged: () => undefined },
      pages: { getCurrentPage: () => page },
      selection: { selectItems: () => undefined },
      settings: { edit: { pasteOffset: 10 } },
    } as unknown as EngineCore;
    expect(new Clipboard(core).paste(PASTED)).toBe(true);
    const pasted = [...pageTree.cells.keys()].find((id) => !['0', '1', 'a'].includes(id))!;
    expect(cellLabelValue(pageTree, pasted)).toBe('X');
    expect(cellLabelValue(pageTree, 'a')).toBe('<b>T</b><br>A');
  });
});
