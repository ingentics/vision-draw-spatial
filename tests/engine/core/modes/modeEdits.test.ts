import { describe, expect, it } from 'vitest';
import { moveCell } from '../../../../src/engine/core/format/cellEdits';
import { removeCells } from '../../../../src/engine/core/format/create';
import { documentFromTree, readDrawio } from '../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { applyModeEdit } from '../../../../src/engine/core/modes/modeEdits';
import type { ModeEdit } from '../../../../src/engine/core/modes/types';

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="test"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" style="fillColor=#ffffff;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="locked" value="L" style="locked=1;" vertex="1" parent="1"><mxGeometry x="200" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="fixed" value="F" style="movable=0;" vertex="1" parent="1"><mxGeometry x="400" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="free" value="X" style="" vertex="1" parent="1"><mxGeometry x="600" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/** Page de test et une fonction qui applique une opération du mode `test` puis relit la page. */
function setup() {
  const { document, tree } = readDrawio(XML);
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void) => {
    const changed = applyModeEdit(page, tree.pages[0]!, { namespace: 'test' }, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { tree, run, page: () => page, shape };
}

describe('écritures d’une opération de mode (sujet 301)', () => {
  it('les attributs du mode, par leur nom court, vont dans son espace de noms', () => {
    const { run, page, shape } = setup();
    run((edit) => {
      edit.setPageAttribute('mode', 'x');
      edit.setElementAttribute('a', 'height', '5');
    });
    // Jamais les clés du tronc : `spatial.mode` et `spatial.height` ne changent pas.
    expect(page().attributes).toMatchObject({ 'spatial.mode': 'test', 'spatial.test.mode': 'x' });
    expect(shape('a').style).toMatchObject({ 'spatial.test.height': '5' });
    expect(shape('a').style['spatial.height']).toBeUndefined();
  });

  it('nom complet, nom injecté ou clé de style refusée : l’opération lève une exception et n’écrit rien', () => {
    const { tree, run } = setup();
    const before = writeDrawio(tree);
    const refused: Array<(edit: ModeEdit) => void> = [
      (edit) => edit.setPageAttribute('spatial.mode', 'x'),
      (edit) => edit.setElementAttribute('a', 'spatial.rdd.fields', '[]'),
      (edit) => edit.setElementAttribute('a', 'x=1;locked', '0'),
      (edit) => edit.setElementAttribute('a', 'a b', '1'),
      (edit) => edit.setElementStyle('a', 'locked', '1'),
      (edit) => edit.setElementStyle('a', 'movable', '0'),
      (edit) => edit.setElementStyle('a', 'spatial.kind', 'x'),
      (edit) => edit.setElementStyle('a', 'fillColor;locked', '1'),
    ];
    for (const operation of refused) {
      expect(() =>
        run((edit) => {
          edit.setElementStyle('a', 'fillColor', '#ff0000');
          operation(edit);
        }),
      ).toThrow(/refusée|invalide/);
      expect(writeDrawio(tree)).toBe(before);
    }
  });

  it('élément verrouillé : ni bornes, ni style, ni ordre ne changent', () => {
    const { run, shape, page } = setup();
    const bounds = { x: 0, y: 300, width: 50, height: 50 };
    expect(
      run((edit) => {
        edit.setShapeBounds('locked', bounds);
        edit.setShapeBounds('fixed', bounds);
        edit.setElementStyle('locked', 'fillColor', '#ff0000');
        edit.sendToBack(['locked', 'fixed']);
      }),
    ).toBe(false);
    expect(shape('locked').bounds).toEqual({ x: 200, y: 0, width: 100, height: 60 });
    expect(shape('fixed').bounds).toEqual({ x: 400, y: 0, width: 100, height: 60 });
    expect(shape('locked').style.fillColor).toBeUndefined();
    expect(page().shapes.map((s) => s.id)).toEqual(['a', 'locked', 'fixed', 'free']);
    // Une forme libre, elle, bouge.
    run((edit) => edit.setShapeBounds('a', bounds));
    expect(shape('a').bounds).toEqual(bounds);
  });
});

describe('attribut d’un élément verrouillé (sujet 324)', () => {
  it('setElementAttribute ignore un élément verrouillé, pas un élément libre', () => {
    const { tree, run, shape } = setup();
    const before = writeDrawio(tree);
    expect(run((edit) => edit.setElementAttribute('locked', 'x', '1'))).toBe(false);
    expect(writeDrawio(tree)).toBe(before);
    expect(
      run((edit) => {
        edit.setElementAttribute('locked', 'x', '1');
        edit.setElementAttribute('a', 'x', '1');
      }),
    ).toBe(true);
    expect(shape('a').style['spatial.test.x']).toBeDefined();
    expect(shape('locked').style['spatial.test.x']).toBeUndefined();
  });
});

describe('écriture qui échoue en route (sujet 302)', () => {
  it('opération : la page revient à l’état d’avant ses écritures, l’erreur remonte', () => {
    const { tree, run } = setup();
    // Le modèle de la page a encore `a`, l'arbre ne l'a plus : la deuxième écriture échoue une fois appliquée.
    removeCells(tree.pages[0]!, ['a']);
    const before = writeDrawio(tree);
    expect(() =>
      run((edit) => {
        edit.setPageAttribute('x', '1');
        edit.setElementAttribute('a', 'y', '2');
      }),
    ).toThrow('Cellule a introuvable');
    expect(writeDrawio(tree)).toBe(before);
  });

  it('remise en ordre après un geste : le geste reste, seules les écritures du mode sont défaites', () => {
    const { document, tree } = readDrawio(XML);
    const pageTree = tree.pages[0]!;
    // Le geste du tronc, déjà écrit : `a` déplacée.
    moveCell(pageTree, 'a', { x: 30, y: 0 });
    const fresh = documentFromTree(tree).pages[0]!;
    removeCells(pageTree, ['free']);
    const afterGesture = writeDrawio(tree);
    expect(() =>
      applyModeEdit(fresh, pageTree, { namespace: 'test' }, (edit) => {
        edit.setElementStyle('a', 'fillColor', '#ff0000');
        edit.setElementAttribute('free', 'y', '2');
      }),
    ).toThrow('Cellule free introuvable');
    expect(writeDrawio(tree)).toBe(afterGesture);
    expect(documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'a')!.bounds.x).toBe(30);
    expect(document.pages[0]!.shapes.find((s) => s.id === 'a')!.bounds.x).toBe(0);
  });
});
