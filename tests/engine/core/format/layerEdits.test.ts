import { describe, expect, it } from 'vitest';
import { addEdgeCell, addShapeCell } from '../../../../src/engine/core/format/create';
import { pasteCells, readClipboardModel } from '../../../../src/engine/core/format/clipboardCells';
import {
  addLayer,
  moveCellsToLayer,
  moveLayer,
  removeLayer,
  renameLayer,
  setLayerElevation,
  setLayerLocked,
  setLayerVisible,
} from '../../../../src/engine/core/format/layerEdits';
import { layerIdsOf } from '../../../../src/engine/core/format/layerTree';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { shapeOf } from '../../../../src/engine/core/model/pageIndex';

// Sujet 523 : calques écrits dans le fichier.

const cell = (id: string, parent: string) =>
  `        <mxCell id="${id}" parent="${parent}" vertex="1"><mxGeometry width="10" height="10" as="geometry" /></mxCell>`;

/** Calque principal `1` (a, b), calque `L2` (c) au-dessus. */
const XML = `<mxfile>
  <diagram id="p" name="P">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cell('a', '1')}
${cell('b', '1')}
        <mxCell id="L2" value="Haut" parent="0" />
${cell('c', 'L2')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

function setup(xml = XML) {
  const { tree } = readDrawio(xml);
  const pageTree = tree.pages[0]!;
  const reread = () => readDrawio(writeDrawio(tree)).document.pages[0]!;
  const order = () => pageTree.cellList.map((nodes) => nodes.id);
  return { tree, pageTree, reread, order };
}

const RECT = { style: 'rounded=0;', value: '', x: 0, y: 0, width: 10, height: 10 };

describe('calques dans le fichier (sujet 523)', () => {
  it('lecture : calques dans l’ordre, verrou, ordre de dessin par calque', () => {
    const { document } = readDrawio(XML.replace('id="L2" value="Haut"', 'id="L2" value="Haut" style="locked=1"'));
    const page = document.pages[0]!;
    expect(page.layers).toEqual([
      { id: '1', name: '', visible: true, locked: false, elevation: 0 },
      { id: 'L2', name: 'Haut', visible: true, locked: true, elevation: 0 },
    ]);
  });

  it('un fichier aux calques entremêlés est dessiné calque par calque', () => {
    const { document } = readDrawio(
      XML.replace(cell('c', 'L2'), '').replace(cell('a', '1'), cell('c', 'L2') + '\n' + cell('a', '1')),
    );
    const page = document.pages[0]!;
    const z = (id: string) => shapeOf(page, id)!.z;
    expect(z('c')).toBeGreaterThan(z('a'));
    expect(z('c')).toBeGreaterThan(z('b'));
    expect(z('b')).toBeGreaterThan(z('a'));
  });

  it('une forme, une flèche, un collage vont à la fin du bloc de leur calque', () => {
    const { pageTree, order } = setup();
    const shape = addShapeCell(pageTree, RECT, '1');
    expect(order()).toEqual(['0', '1', 'a', 'b', shape, 'L2', 'c']);
    const edge = addEdgeCell(pageTree, { source: 'a', target: 'b', style: '' }, '1');
    expect(order()).toEqual(['0', '1', 'a', 'b', shape, edge, 'L2', 'c']);
    const top = addShapeCell(pageTree, RECT, 'L2');
    expect(order().slice(-2)).toEqual(['c', top]);
    const model = readClipboardModel(
      '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="x" vertex="1" parent="1"><mxGeometry width="5" height="5" as="geometry"/></mxCell><mxCell id="y" vertex="1" parent="1"><mxGeometry width="5" height="5" as="geometry"/></mxCell></root></mxGraphModel>',
    )!;
    const pasted = pasteCells(pageTree, model, { delta: { x: 0, y: 0 }, layerId: '1' });
    expect(order()).toEqual(['0', '1', 'a', 'b', shape, edge, ...pasted, 'L2', 'c', top]);
  });

  it('sans calque donné (ou inconnu) : le premier calque', () => {
    const { pageTree, reread } = setup();
    const id = addShapeCell(pageTree, RECT, 'inconnu');
    expect(shapeOf(reread(), id)!.layerId).toBe('1');
  });

  it('ajouter : nouveau calque au-dessus de tous, nommé', () => {
    const { pageTree, reread } = setup();
    const id = addLayer(pageTree, 'Calque 3');
    expect(layerIdsOf(pageTree)).toEqual(['1', 'L2', id]);
    expect(reread().layers.at(-1)).toEqual({ id, name: 'Calque 3', visible: true, locked: false, elevation: 0 });
  });

  it('ajouter sur une page vide : le calque principal est créé d’abord', () => {
    const { pageTree } = setup(
      '<mxfile><diagram id="p" name="P"><mxGraphModel><root></root></mxGraphModel></diagram></mxfile>',
    );
    const id = addLayer(pageTree, 'Calque 2');
    expect(layerIdsOf(pageTree)).toEqual(['1', id]);
  });

  it('renommer, masquer, verrouiller : attributs du calque, retirés au retour', () => {
    const { tree, pageTree, reread } = setup();
    renameLayer(pageTree, '1', 'Fond');
    setLayerVisible(pageTree, 'L2', false);
    setLayerLocked(pageTree, '1', true);
    expect(reread().layers).toEqual([
      { id: '1', name: 'Fond', visible: true, locked: true, elevation: 0 },
      { id: 'L2', name: 'Haut', visible: false, locked: false, elevation: 0 },
    ]);
    expect(writeDrawio(tree)).toContain('<mxCell id="L2" value="Haut" parent="0" visible="0"/>');
    setLayerVisible(pageTree, 'L2', true);
    setLayerLocked(pageTree, '1', false);
    expect(writeDrawio(tree)).toContain('<mxCell id="L2" value="Haut" parent="0"/>');
    expect(writeDrawio(tree)).toContain('<mxCell id="1" parent="0" value="Fond"/>');
  });

  it('élévation (sujet 524) : spatial.elevation dans le style du calque, retirée à 0', () => {
    const { tree, pageTree, reread } = setup();
    setLayerElevation(pageTree, 'L2', 40);
    expect(reread().layers[1]!.elevation).toBe(40);
    expect(writeDrawio(tree)).toContain('<mxCell id="L2" value="Haut" parent="0" style="spatial.elevation=40;"/>');
    setLayerElevation(pageTree, 'L2', 0);
    expect(reread().layers[1]!.elevation).toBe(0);
    expect(writeDrawio(tree)).toContain('<mxCell id="L2" value="Haut" parent="0"/>');
  });

  it('monter, descendre : le bloc du calque bouge avec son contenu ; au bout, rien', () => {
    const { pageTree, order, reread } = setup();
    expect(moveLayer(pageTree, 'L2', 'up')).toBe(false);
    expect(moveLayer(pageTree, 'L2', 'down')).toBe(true);
    expect(order()).toEqual(['0', 'L2', 'c', '1', 'a', 'b']);
    const page = reread();
    expect(shapeOf(page, 'a')!.z).toBeGreaterThan(shapeOf(page, 'c')!.z);
    expect(moveLayer(pageTree, 'L2', 'down')).toBe(false);
  });

  it('supprimer : le calque, son contenu et les flèches qui y sont reliées ; jamais le dernier', () => {
    const { pageTree, order } = setup();
    const edge = addEdgeCell(pageTree, { source: 'a', target: 'c', style: '' }, '1');
    expect(removeLayer(pageTree, 'L2')).toBe(true);
    expect(order()).toEqual(['0', '1', 'a', 'b']);
    expect(order()).not.toContain(edge);
    expect(removeLayer(pageTree, '1')).toBe(false);
    expect(order()).toEqual(['0', '1', 'a', 'b']);
  });

  it('changer de calque : la cellule et son contenu passent à la fin du bloc ; un élément contenu ne bouge pas', () => {
    const { pageTree, order, reread } = setup(XML.replace(cell('b', '1'), cell('b', '1') + '\n' + cell('inside', 'b')));
    expect(moveCellsToLayer(pageTree, ['b', 'inside', 'c'], 'L2')).toEqual(['b']);
    expect(order()).toEqual(['0', '1', 'a', 'L2', 'c', 'b', 'inside']);
    const page = reread();
    expect(shapeOf(page, 'b')!.layerId).toBe('L2');
    expect(shapeOf(page, 'inside')!.layerId).toBe('L2');
    expect(moveCellsToLayer(pageTree, ['c'], 'L2')).toEqual([]);
  });

  it('le fichier reste indenté', () => {
    const { tree, pageTree } = setup();
    moveCellsToLayer(pageTree, ['a'], 'L2');
    addShapeCell(pageTree, { ...RECT, value: 'n' }, '1');
    const lines = writeDrawio(tree).split('\n');
    for (const line of lines.filter((l) => l.includes('<mxCell id=') && !l.includes('id="0"')))
      expect(line.startsWith('        <mxCell')).toBe(true);
  });
});
