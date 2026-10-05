import { describe, expect, it } from 'vitest';
import { reorderCells } from '../../../src/engine/format/order';
import type { OrderMove } from '../../../src/engine/format/order';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';

// Étape 130 : ordre de dessin (premier plan, arrière-plan, avancer, reculer).

const cell = (id: string, parent = '1', extra = '') =>
  `        <mxCell id="${id}" parent="${parent}" ${extra}vertex="1"><mxGeometry width="10" height="10" as="geometry" /></mxCell>`;

const file = (cells: string[]) => `<mxfile>
  <diagram id="p" name="P">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

function run(cells: string[], ids: string[], move: OrderMove) {
  const xml = file(cells);
  const { tree } = readDrawio(xml);
  const changed = reorderCells(tree.pages[0]!, ids, move);
  const written = writeDrawio(tree);
  const { document } = readDrawio(written);
  const page = document.pages[0]!;
  const order = [...page.shapes, ...page.edges].sort((a, b) => a.z - b.z).map((e) => e.id);
  return { changed, order, written, xml };
}

const abcd = ['a', 'b', 'c', 'd'].map((id) => cell(id));

describe('reorderCells', () => {
  it('premier plan, arrière-plan : la sélection garde son ordre', () => {
    expect(run(abcd, ['a', 'c'], 'front').order).toEqual(['b', 'd', 'a', 'c']);
    expect(run(abcd, ['b', 'd'], 'back').order).toEqual(['b', 'd', 'a', 'c']);
  });

  it('avancer, reculer : une place, en passant la voisine non choisie', () => {
    expect(run(abcd, ['a'], 'forward').order).toEqual(['b', 'a', 'c', 'd']);
    expect(run(abcd, ['a', 'b'], 'forward').order).toEqual(['c', 'a', 'b', 'd']);
    expect(run(abcd, ['d'], 'backward').order).toEqual(['a', 'b', 'd', 'c']);
  });

  it('déjà à sa place : rien ne change, le fichier est intact', () => {
    const { changed, written, xml } = run(abcd, ['d'], 'front');
    expect(changed).toBe(false);
    expect(written).toBe(xml.replace(/ \/>/g, '/>'));
    expect(run(abcd, ['a'], 'backward').changed).toBe(false);
  });

  it('indentation conservée : seul l’ordre des lignes change', () => {
    const { written, xml } = run(abcd, ['a'], 'front');
    const lines = (text: string) => text.replace(/ \/>/g, '/>').split('\n');
    expect([...lines(written)].sort()).toEqual([...lines(xml)].sort());
    expect(lines(written).findIndex((l) => l.includes('id="a"'))).toBe(
      lines(xml).findIndex((l) => l.includes('id="d"')),
    );
  });

  it('un conteneur emmène son contenu ; on reste parmi les cellules de même parent', () => {
    const cells = [cell('box'), cell('in1', 'box'), cell('in2', 'box'), cell('x')];
    expect(run(cells, ['box'], 'front').order).toEqual(['x', 'box', 'in1', 'in2']);
    expect(run(cells, ['in1'], 'front').order).toEqual(['box', 'in2', 'in1', 'x']);
  });

  it('une flèche passe sous une forme avec ses labels', () => {
    const cells = [
      cell('a'),
      `        <mxCell id="e" parent="1" edge="1"><mxGeometry relative="1" as="geometry"><mxPoint as="sourcePoint" /><mxPoint x="50" as="targetPoint" /></mxGeometry></mxCell>`,
      `        <mxCell id="l" value="x" parent="e" vertex="1" connectable="0"><mxGeometry x="-0.5" relative="1" as="geometry" /></mxCell>`,
    ];
    const { order, written } = run(cells, ['e'], 'back');
    expect(order).toEqual(['e', 'a']);
    expect(written.indexOf('id="l"')).toBeLessThan(written.indexOf('id="a"'));
  });
});
