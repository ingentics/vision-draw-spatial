import { describe, expect, it } from 'vitest';
import { setCellStyleValue, setPageAttribute } from '../../../../src/engine/core/format/cellEdits';
import { removeCells } from '../../../../src/engine/core/format/create';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { readDrawioTree, snapshotPage } from '../../../../src/engine/core/format/xmlTree';
import { fixture } from '../../../helpers';

describe('instantané d’une page (sujet 302)', () => {
  it.each(['simple.drawio', 'compressed.drawio'])(
    '%s : contenu, attributs de <diagram>, cellules et page modifiée remis en l’état',
    (file) => {
      const tree = readDrawioTree(fixture(file));
      const page = tree.pages[0]!;
      const before = writeDrawio(tree);
      const ids = [...page.cells.keys()];
      const restore = snapshotPage(page);
      const [first, second] = page.cellList.filter((nodes) => nodes.cell?.getAttribute('vertex') === '1');
      setCellStyleValue(page, first!.id, 'fillColor', '#ff0000');
      setPageAttribute(page, 'spatial.test.x', '1');
      removeCells(page, [second!.id]);
      expect(page.dirty).toBe(true);
      restore();
      expect(writeDrawio(tree)).toBe(before);
      expect(page.dirty).toBe(false);
      expect([...page.cells.keys()]).toEqual(ids);
      // Les cellules réindexées sont celles de l'arbre : une écriture après la restauration y arrive.
      setCellStyleValue(page, first!.id, 'fillColor', '#00ff00');
      expect(writeDrawio(tree)).not.toBe(before);
    },
  );
});
