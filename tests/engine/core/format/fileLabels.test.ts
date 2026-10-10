import { describe, expect, it } from 'vitest';
import { cellLabelValue } from '../../../../src/engine/core/format/cellEdits';
import {
  rewriteLabels,
  rewriteLabelsForWriting,
  rewritePageLabels,
} from '../../../../src/engine/core/format/fileLabels';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { readDrawio } from '../../../../src/engine/core/format/parse';

const cell = (id: string, value: string, style: string) =>
  `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry width="100" height="60" as="geometry"/></mxCell>`;
const file = (cells: string) =>
  `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`;

/** Labels de `cells` réécrits par `labelOf` : valeurs reçues, puis valeur et style écrits de chaque cellule. */
function rewritten(cells: string, labelOf: (value: string) => string | undefined, only?: string[]) {
  const { document, tree } = readDrawio(file(cells));
  const received: string[] = [];
  const page = document.pages[0]!;
  const pageTree = tree.pages[0]!;
  const rewrite = (_p: unknown, _s: unknown, value: string) => {
    received.push(value);
    return labelOf(value);
  };
  const changed = only
    ? rewritePageLabels(page, pageTree, rewrite, new Set(only))
    : rewriteLabels(document, tree, rewrite).length > 0;
  const written = page.shapes.map((s) => [
    cellLabelValue(pageTree, s.id),
    pageTree.cells.get(s.id)!.cell!.getAttribute('style'),
  ]);
  return { changed, received, written };
}

describe('labels réécrits entre le fichier et l’appli (sujets 478, 503)', () => {
  it('label HTML : reçu et réécrit tel quel ; inchangé ou undefined : rien', () => {
    expect(rewritten(cell('a', '&lt;i&gt;A&lt;/i&gt;', 'html=1;'), (v) => `<b>T</b><br>${v}`)).toEqual({
      changed: true,
      received: ['<i>A</i>'],
      written: [['<b>T</b><br><i>A</i>', 'html=1;']],
    });
    expect(rewritten(cell('a', 'A', 'html=1;'), (v) => v).changed).toBe(false);
    expect(rewritten(cell('a', 'A', 'html=1;'), () => undefined).changed).toBe(false);
  });

  it('texte brut : reçu en HTML échappé ; réécrit avec mise en forme, il passe en html=1 sans changer de texte', () => {
    const { received, written } = rewritten(cell('a', 'A&lt;B &amp;amp; C&#10;D', ''), (v) => `<b>T</b><br>${v}`);
    expect(received).toEqual(['A&lt;B &amp;amp; C<br>D']);
    expect(written).toEqual([['<b>T</b><br>A&lt;B &amp;amp; C<br>D', 'html=1;']]);
  });

  it('texte brut réécrit sans mise en forme : il reste brut', () => {
    const { written } = rewritten(cell('a', 'x A&lt;B', ''), (v) => v.slice(2));
    expect(written).toEqual([['A<B', '']]);
  });

  it('`only` : seulement ces formes', () => {
    const cells = cell('a', 'A', 'html=1;') + cell('b', 'B', 'html=1;');
    expect(rewritten(cells, (v) => `${v}!`, ['b']).written).toEqual([
      ['A', 'html=1;'],
      ['B!', 'html=1;'],
    ]);
  });
});

describe('labels écrits le temps d’enregistrer (sujet 513)', () => {
  it('réécrits en place, puis remis sur les mêmes nœuds : label, style et page marquée modifiée', () => {
    const cells = cell('a', 'A', '') + cell('b', 'B', 'html=1;') + cell('c', 'C', 'html=1;');
    const { document, tree } = readDrawio(file(cells));
    const page = document.pages[0]!;
    const pageTree = tree.pages[0]!;
    const before = writeDrawio(tree);
    const nodes = pageTree.cells.get('a');
    const restore = rewriteLabelsForWriting(page, pageTree, (_p, shape, value) =>
      shape.id === 'c' ? undefined : `<b>T</b><br>${value}`,
    )!;
    expect(cellLabelValue(pageTree, 'a')).toBe('<b>T</b><br>A');
    expect(pageTree.cells.get('a')!.cell!.getAttribute('style')).toBe('html=1;');
    restore();
    // Page marquée modifiée : compressée, elle serait réencodée sans les labels écrits.
    expect(pageTree.dirty).toBe(true);
    expect(writeDrawio(tree)).toBe(before);
    expect(pageTree.cells.get('a')).toBe(nodes);
  });

  it('rien à réécrire : undefined', () => {
    const { document, tree } = readDrawio(file(cell('a', 'A', 'html=1;')));
    expect(rewriteLabelsForWriting(document.pages[0]!, tree.pages[0]!, () => undefined)).toBeUndefined();
  });
});
