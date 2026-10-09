import { describe, expect, it } from 'vitest';
import { CellIndex } from '../../../../src/engine/core/format/cellIndex';
import { readDrawioTree } from '../../../../src/engine/core/format/xmlTree';
import type { ParseWarning } from '../../../../src/engine/core/model/types';

const xml = (cells: string) =>
  `<mxfile><diagram id="p" name="P"><mxGraphModel><root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="L2" value="Calque 2" parent="0" visible="0"/>
    ${cells}
  </root></mxGraphModel></diagram></mxfile>`;

function indexOf(cells: string): { index: CellIndex; warnings: ParseWarning[] } {
  const warnings: ParseWarning[] = [];
  return { index: new CellIndex(readDrawioTree(xml(cells)).pages[0]!, warnings), warnings };
}

const cell = (index: CellIndex, id: string) => index.byId.get(id)!;

describe('CellIndex', () => {
  it('calques : enfants de la racine, ni vertex ni arête', () => {
    const { index } = indexOf(
      '<mxCell id="a" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>',
    );
    expect(index.layers).toEqual([
      { id: '1', name: '', visible: true },
      { id: 'L2', name: 'Calque 2', visible: false },
    ]);
    expect(index.isRoot(cell(index, '0'))).toBe(true);
    expect(index.isLayer(cell(index, 'L2'))).toBe(true);
    expect(index.isLayer(cell(index, 'a'))).toBe(false);
  });

  it('calque d’une cellule : remonte les groupes ; sans parent, le premier calque', () => {
    const { index } = indexOf(`
      <mxCell id="g" vertex="1" parent="L2"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="child" vertex="1" parent="g"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="loose" vertex="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>`);
    expect(index.layerOf(cell(index, 'child'))).toBe('L2');
    expect(index.layerOf(cell(index, 'loose'))).toBe('1');
  });

  it('emprise absolue : relative au parent vertex, fractions de sa taille pour une géométrie relative', () => {
    const { index } = indexOf(`
      <mxCell id="g" vertex="1" parent="1"><mxGeometry x="100" y="50" width="200" height="100" as="geometry"/></mxCell>
      <mxCell id="child" vertex="1" parent="g"><mxGeometry x="10" y="20" width="30" height="40" as="geometry"/></mxCell>
      <mxCell id="port" vertex="1" parent="g">
        <mxGeometry x="1" y="0.5" width="8" height="8" relative="1" as="geometry"><mxPoint x="-4" y="-4" as="offset"/></mxGeometry>
      </mxCell>`);
    expect(index.absoluteBounds(cell(index, 'child'))).toEqual({ x: 110, y: 70, width: 30, height: 40 });
    expect(index.absoluteBounds(cell(index, 'port'))).toEqual({ x: 296, y: 96, width: 8, height: 8 });
  });

  it('signale doublons, parents introuvables et cycles', () => {
    const { index, warnings } = indexOf(`
      <mxCell id="a" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="a" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="orphan" vertex="1" parent="nowhere"><mxGeometry x="5" y="5" width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="c1" vertex="1" parent="c2"><mxGeometry x="1" y="1" width="10" height="10" as="geometry"/></mxCell>
      <mxCell id="c2" vertex="1" parent="c1"><mxGeometry x="1" y="1" width="10" height="10" as="geometry"/></mxCell>`);
    expect(warnings).toEqual([{ pageId: 'p', cellId: 'a', message: 'Identifiant de cellule dupliqué' }]);
    expect(index.absoluteBounds(cell(index, 'orphan'))).toEqual({ x: 5, y: 5, width: 10, height: 10 });
    expect(warnings[1]).toEqual({ pageId: 'p', cellId: 'orphan', message: 'Parent introuvable : nowhere' });
    index.absoluteBounds(cell(index, 'c1'));
    expect(warnings[2]?.message).toBe('Cycle dans la hiérarchie des parents');
  });
});
