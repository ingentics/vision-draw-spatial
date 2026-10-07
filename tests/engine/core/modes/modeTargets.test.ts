import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { edgeTarget, onlyWhen, shapeTarget } from '../../../../src/engine/core/modes/modeTargets';
import type { ModeProperty } from '../../../../src/engine/core/modes/types';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="a" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe('cibles d’un réglage de mode (sujet 325)', () => {
  const page = readDrawio(XML).document.pages[0]!;
  const shape = page.shapes[0]!;
  const edge = page.edges[0]!;

  it('forme, flèche ou page', () => {
    expect(shapeTarget(shape)).toBe(shape);
    expect(shapeTarget(edge)).toBeUndefined();
    expect(shapeTarget(page)).toBeUndefined();
    expect(edgeTarget(edge)).toBe(edge);
    expect(edgeTarget(shape)).toBeUndefined();
    expect(edgeTarget(page)).toBeUndefined();
  });

  it('onlyWhen : la condition s’ajoute à celle du réglage', () => {
    const properties: ModeProperty[] = [
      { type: 'toggle', key: 'free', label: 'Libre' },
      { type: 'toggle', key: 'hidden', label: 'Masqué', hidden: () => true },
    ];
    const [free, hidden] = onlyWhen(properties, (_page, target) => shapeTarget(target) !== undefined);
    expect(free!.hidden!(page, shape)).toBe(false);
    expect(free!.hidden!(page, edge)).toBe(true);
    expect(hidden!.hidden!(page, shape)).toBe(true);
    expect(properties[0]!.hidden).toBeUndefined();
  });
});
