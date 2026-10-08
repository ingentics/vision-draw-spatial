import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { callMode } from '../../../../src/engine/core/modes/modeCalls';
import { ModeEditWriter } from '../../../../src/engine/core/modes/modeEditWriter';
import type { ModeEdit } from '../../../../src/engine/core/modes/modeEdit';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe('arguments d’un point d’entrée de mode (sujet 379)', () => {
  it('objets simples en lecture seule, opération et valeurs simples telles quelles', () => {
    const { document, tree } = readDrawio(XML);
    const page = document.pages[0]!;
    const writer = new ModeEditWriter(page, tree.pages[0]!, { namespace: 'essai' });
    const values = { gap: 10 };
    const seen = callMode(
      (edit: ModeEdit, shape: (typeof page.shapes)[number], settings: typeof values, part: string, count: number) => {
        expect(() => ((shape.bounds as { x: number }).x = 5)).toThrow(TypeError);
        expect(() => (settings.gap = 0)).toThrow(TypeError);
        // L'opération reste la même instance : ses écritures sont celles que l'hôte appliquera.
        edit.setElementAttribute(shape.id, 'rang', String(count));
        return { edit, part };
      },
      writer,
      page.shapes[0]!,
      values,
      'haut',
      2,
    );
    expect(seen.edit).toBe(writer);
    expect(seen.part).toBe('haut');
    expect(page.shapes[0]!.bounds.x).toBe(0);
    expect(values.gap).toBe(10);
    expect(writer.apply()).toBe(true);
  });
});
