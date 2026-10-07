import { describe, expect, it } from 'vitest';
import { addPage, addShapeCell, newCellId, removePage, renamePage } from '../../../../src/engine/core/format/create';
import { documentFromTree, readDrawio } from '../../../../src/engine/core/format/parse';
import { createEmptyDrawio } from '../../../../src/engine/core/format/skeleton';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { fixture } from '../../../helpers';

const RECT = { style: 'rounded=0;whiteSpace=wrap;html=1;', value: '', x: 40, y: 60, width: 120, height: 60 };

describe('addShapeCell', () => {
  it('nouveau fichier : un vertex sur le calque par défaut, relu à l’identique', () => {
    const { tree } = readDrawio(createEmptyDrawio('Page-1', 'p1'));
    const id = addShapeCell(tree.pages[0]!, RECT);
    expect(id).toMatch(/^[\w-]{20}-1$/);

    const written = writeDrawio(tree);
    expect(written).toContain(
      `<mxCell id="${id}" value="" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">` +
        '<mxGeometry x="40" y="60" width="120" height="60" as="geometry"/></mxCell>',
    );
    // Même indentation que les cellules voisines.
    expect(written).toContain(`<mxCell id="1" parent="0"/>\n        <mxCell id="${id}"`);
    const shape = readDrawio(written).document.pages[0]!.shapes[0]!;
    expect(shape).toMatchObject({
      id,
      kind: 'rectangle',
      layerId: '1',
      bounds: { x: 40, y: 60, width: 120, height: 60 },
    });
  });

  it('page compressée : réécrite compressée avec la nouvelle forme', () => {
    const { tree } = readDrawio(fixture('compressed.drawio'));
    const id = addShapeCell(tree.pages[0]!, RECT);
    expect(tree.pages[0]!.dirty).toBe(true);
    const written = writeDrawio(tree);
    expect(written).not.toContain('<mxGraphModel');
    expect(readDrawio(written).document.pages[0]!.shapes.some((s) => s.id === id)).toBe(true);
  });

  it('page vide (<diagram> sans contenu) : modèle minimal créé, calque compris', () => {
    const { tree } = readDrawio('<mxfile><diagram id="e" name="Vide"></diagram></mxfile>');
    const page = tree.pages[0]!;
    const id = addShapeCell(page, RECT);
    expect(page.encoding).toBe('inline');
    const model = readDrawio(writeDrawio(tree)).document.pages[0]!;
    expect(model.layers.map((l) => l.id)).toEqual(['1']);
    expect(model.shapes.map((s) => s.id)).toEqual([id]);
  });

  it('ancien format : ajoutée au premier calque existant', () => {
    const { tree } = readDrawio(fixture('legacy.xml'));
    const id = addShapeCell(tree.pages[0]!, RECT);
    expect(readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === id)?.layerId).toBe('1');
  });

  it('refuse une page illisible', () => {
    const { tree } = readDrawio(fixture('broken.drawio'));
    expect(() => addShapeCell(tree.pages[0]!, RECT)).toThrow();
  });

  it('newCellId : jamais un id déjà pris, compteur croissant', () => {
    const page = readDrawio(createEmptyDrawio()).tree.pages[0]!;
    const first = addShapeCell(page, RECT);
    const second = addShapeCell(page, RECT);
    expect(second).toBe(first.replace(/-1$/, '-2'));
    expect(page.cells.has(newCellId(page))).toBe(false);
  });
});

describe('pages', () => {
  it('ajout, renommage, retrait : le modèle relu suit l’arbre', () => {
    const { tree } = readDrawio(fixture('multipage.drawio'));
    const count = tree.pages.length;
    const page = addPage(tree, 'Nouvelle');
    expect(tree.pages).toHaveLength(count + 1);
    addShapeCell(page, RECT);
    renamePage(tree, page.id, 'Renommée');

    let doc = readDrawio(writeDrawio(tree)).document;
    expect(doc.pages.at(-1)).toMatchObject({ id: page.id, name: 'Renommée' });
    expect(doc.pages.at(-1)!.shapes).toHaveLength(1);

    removePage(tree, page.id);
    doc = documentFromTree(tree);
    expect(doc.pages.map((p) => p.id)).not.toContain(page.id);
    expect(writeDrawio(tree)).not.toContain('Renommée');
  });

  it('nouvelle page indentée comme les autres', () => {
    const { tree } = readDrawio(fixture('multipage.drawio'));
    const page = addPage(tree, 'Indentée');
    expect(writeDrawio(tree)).toContain(`/>\n  <diagram id="${page.id}" name="Indentée">\n    <mxGraphModel`);
  });

  it('un fichier garde au moins une page ; l’ancien format n’a pas de pages', () => {
    const single = readDrawio(createEmptyDrawio()).tree;
    expect(() => removePage(single, single.pages[0]!.id)).toThrow();
    const legacy = readDrawio(fixture('legacy.xml')).tree;
    expect(() => addPage(legacy, 'x')).toThrow();
  });
});
