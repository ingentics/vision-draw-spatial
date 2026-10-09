import { describe, expect, it, vi } from 'vitest';
import { TextEdits } from '../../../../../../src/engine/core/domains/edit/text/textEdits';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { cellLabelValue } from '../../../../../../src/engine/core/format/cellEdits';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { fixture } from '../../../../../helpers';

/** Texte de la forme `a` (html=1) de `three-rectangles.drawio` saisi sur un cœur réduit à ce que `setLabel` lit. */
function write(text: string, html?: string): string {
  const { tree, document } = readDrawio(fixture('three-rectangles.drawio'));
  const pageTree = tree.pages[0]!;
  const core = {
    targets: { editablePage: () => ({ page: document.pages[0]!, pageTree }) },
    edits: { recordEdit: vi.fn() },
    modeFollowUps: { elementRelabeled: vi.fn() },
    file: { documentChanged: vi.fn() },
  } as unknown as EngineCore;
  new TextEdits(core).setLabel('a', text, html);
  return cellLabelValue(pageTree, 'a');
}

describe('texte saisi d’une forme (sujet 407)', () => {
  it('lignes vides en tête, au milieu et en fin écrites', () => {
    expect(write('\na\n\nb\n')).toBe('<br>a<br><br>b<div><br></div>');
  });

  it('que des blancs et des lignes vides : texte vidé, HTML ignoré', () => {
    expect(write(' \n\n', '<b> </b><br><br>')).toBe('');
  });
});
