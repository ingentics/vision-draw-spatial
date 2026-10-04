import { describe, expect, it } from 'vitest';
import { copyCells, pasteCells, readClipboardModel } from '../../../src/engine/format/clipboard';
import type { CopyOptions } from '../../../src/engine/format/clipboard';
import { encodeDiagram } from '../../../src/engine/format/decode';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';

// Conteneur C (100,100) avec A dedans ; B sur le calque ; A→B ; B→D (D non copié) ; points de passage.
const FILE = `<mxfile><diagram id="p" name="P"><mxGraphModel gridSize="10"><root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="C" value="" style="swimlane;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry"/></mxCell>
  <UserObject id="A" label="A" link="https://example.com"><mxCell style="rounded=1;" vertex="1" parent="C"><mxGeometry x="20" y="40" width="60" height="30" as="geometry"/></mxCell></UserObject>
  <mxCell id="B" value="B" style="" vertex="1" parent="1"><mxGeometry x="400" y="100" width="80" height="40" as="geometry"/></mxCell>
  <mxCell id="D" value="D" style="" vertex="1" parent="1"><mxGeometry x="600" y="100" width="80" height="40" as="geometry"/></mxCell>
  <mxCell id="AB" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="1" source="A" target="B"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="300" y="155"/></Array></mxGeometry></mxCell>
  <mxCell id="AB-l" value="lbl" style="edgeLabel;" vertex="1" connectable="0" parent="AB"><mxGeometry x="-0.5" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>
  <mxCell id="BD" edge="1" parent="1" source="B" target="D"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

function setup() {
  const { document, tree } = readDrawio(FILE);
  const model = document.pages[0]!;
  const options: CopyOptions = {
    origin: (id) => model.shapes.find((s) => s.id === id)?.bounds,
    edgeEnd: (id, end) => (id === 'BD' && end === 'target' ? { x: 600, y: 120 } : undefined),
  };
  return { tree, page: tree.pages[0]!, options };
}

describe('copyCells', () => {
  it('copie descendants et flèches entre éléments copiés, en coordonnées absolues', () => {
    const { page, options } = setup();
    const xml = copyCells(page, ['C', 'B'], options)!;
    const copy = readDrawio(`<mxfile><diagram id="c">${xml}</diagram></mxfile>`).document.pages[0]!;
    expect(copy.shapes.map((s) => s.id).sort()).toEqual(['A', 'B', 'C']);
    expect(copy.shapes.find((s) => s.id === 'A')!.bounds).toMatchObject({ x: 120, y: 140 });
    // AB : ses deux bouts sont copiés ; BD non (D ne l’est pas, et BD n’est pas sélectionnée).
    expect(copy.edges.map((e) => e.id).sort()).toEqual(['AB']);
  });

  it('flèche sélectionnée sans sa cible : le bout devient un point libre à sa position', () => {
    const { page, options } = setup();
    const xml = copyCells(page, ['B', 'BD'], options)!;
    expect(xml).toContain('<mxCell id="BD" edge="1" parent="1" source="B">');
    expect(xml).toContain('<mxPoint as="targetPoint" x="600" y="120"/>');
  });

  it('un enfant copié seul passe sur le calque, à sa position absolue', () => {
    const { page, options } = setup();
    const xml = copyCells(page, ['A'], options)!;
    expect(xml).toContain('parent="1"><mxGeometry x="120" y="140" width="60" height="30"');
  });
});

describe('pasteCells', () => {
  it('nouveaux id, flèches rebranchées, décalage des seules cellules du haut', () => {
    const { tree, page, options } = setup();
    const xml = copyCells(page, ['C', 'B'], options)!;
    const roots = pasteCells(page, readClipboardModel(xml)!, { delta: { x: 10, y: 10 } });
    expect(roots).toHaveLength(3); // C, B et la flèche AB (sur le calque)
    const model = readDrawio(writeDrawio(tree)).document.pages[0]!;
    expect(model.shapes).toHaveLength(4 + 3);
    const [c, b] = roots.map((id) => model.shapes.find((s) => s.id === id)!);
    expect(c!.bounds).toMatchObject({ x: 110, y: 110 });
    expect(b!.bounds).toMatchObject({ x: 410, y: 110 });
    const a = model.shapes.find((s) => s.parentId === c!.id)!;
    expect(a.bounds).toMatchObject({ x: 130, y: 150 });
    expect(a.link).toMatchObject({ type: 'url' });
    const edge = model.edges.find((e) => e.sourceId === a.id)!;
    expect(edge.targetId).toBe(b!.id);
    expect(edge.points).toEqual([{ x: 310, y: 165 }]);
    expect(edge.labels.map((l) => l.label)).toEqual(['lbl']);
  });

  it('recolle dans un parent donné, en coordonnées relatives à lui', () => {
    const { tree, page, options } = setup();
    const xml = copyCells(page, ['A'], options)!;
    const [id] = pasteCells(page, readClipboardModel(xml)!, {
      delta: { x: 10, y: 10 },
      parentOf: () => ({ id: 'C', origin: { x: 100, y: 100 } }),
    });
    const shape = readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === id)!;
    expect(shape).toMatchObject({ parentId: 'C', bounds: { x: 130, y: 150 } });
  });
});

describe('readClipboardModel', () => {
  const xml =
    '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" vertex="1" parent="1"/></root></mxGraphModel>';

  it('lit le XML en clair, encodé en URI, compressé ou dans un <mxfile>', () => {
    expect(readClipboardModel(xml)).toBeDefined();
    expect(readClipboardModel(encodeURIComponent(xml))).toBeDefined();
    expect(readClipboardModel(encodeDiagram(xml))).toBeDefined();
    expect(readClipboardModel(`<mxfile><diagram id="d">${xml}</diagram></mxfile>`)).toBeDefined();
  });

  it('ignore un texte quelconque ou un modèle sans forme', () => {
    expect(readClipboardModel('bonjour')).toBeUndefined();
    expect(readClipboardModel('<p>x</p>')).toBeUndefined();
    expect(readClipboardModel('<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>')).toBeUndefined();
  });
});
