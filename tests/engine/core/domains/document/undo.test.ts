import { describe, expect, it } from 'vitest';
import { EditHistory } from '../../../../../src/engine/core/domains/document/undo';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';

/** Pile d'annulation seule : les instantanés n'ont pas besoin du reste du moteur. */
const history = () => new EditHistory({} as EngineCore);

/** Instantanés de la pile, du plus récent au plus ancien. */
function snapshots(edits: EditHistory): string[] {
  const out: string[] = [];
  for (let previous = edits.undoStack.undo('now'); previous !== undefined; previous = edits.undoStack.undo('now'))
    out.push(previous);
  return out;
}

describe('instantanés d’annulation en direct (sujet 271)', () => {
  it('même clé : une seule étape, avec l’état d’avant la saisie', () => {
    const edits = history();
    edits.recordSnapshot('Préfixe', 'avant', 'k');
    edits.recordSnapshot('Préfixe', 'P', 'k');
    edits.recordSnapshot('Préfixe', 'PL', 'k');
    expect(snapshots(edits)).toEqual(['avant']);
  });

  it('autre clé, ou une étape enregistrée entre-temps : une nouvelle étape', () => {
    const edits = history();
    edits.recordSnapshot('Préfixe', 'a', 'k');
    edits.recordSnapshot('Préfixe', 'b', 'k2');
    edits.recordSnapshot('Style', 'c');
    edits.recordSnapshot('Préfixe', 'd', 'k2');
    expect(snapshots(edits)).toEqual(['d', 'c', 'b', 'a']);
  });
});
