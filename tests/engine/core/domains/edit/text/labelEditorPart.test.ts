import { describe, expect, it, vi } from 'vitest';
import { LabelEditor } from '../../../../../../src/engine/core/domains/edit/text/labelEditor';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import type { LabelEditRequest } from '../../../../../../src/engine/core/domains/types';
import type { ModePartText } from '../../../../../../src/engine/core/modes/types';

/** Éditeur sur un cœur réduit à ce que `editPartLabel` lit ; renvoie la demande d'édition ouverte. */
function open(text: ModePartText): LabelEditRequest {
  const shape = { id: 's' };
  const core = {
    targets: { editablePage: () => ({ page: { id: 'p' } }) },
    shapeParts: { text: () => text },
    pages: { getCurrentPage: () => ({ shapes: [shape] }) },
    projection: { screenRectOf: () => ({ x: 0, y: 0, width: 100, height: 50 }) },
    sceneView: { labelTop: () => 0 },
    camera: { state: { mode: '2d', zoom: 1 } },
  } as unknown as EngineCore;
  const editor = new LabelEditor(core);
  const start = vi.spyOn(editor, 'startLabelEdit').mockImplementation(() => undefined);
  editor.editPartLabel('s', '0');
  return start.mock.calls[0]![0];
}

const BASE: ModePartText = { text: 'a', zone: { x: 0, y: 0, width: 100, height: 50 }, fontSize: 12 };

describe('édition du texte d’une partie (sujet 331)', () => {
  it('par défaut : une ligne, centrée verticalement, police du texte', () => {
    const request = open(BASE);
    expect(request.singleLine).toBe(true);
    expect(request.style.verticalAlign).toBe('middle');
    expect(request.style.fontFamily).toBeUndefined();
  });

  it('multiline + monospace : éditeur multiligne en haut à gauche, en police de code, sans retour automatique', () => {
    const request = open({ ...BASE, multiline: true, monospace: true });
    expect(request.singleLine).toBeUndefined();
    expect(request.plain).toBe(true);
    expect(request.style.verticalAlign).toBe('top');
    expect(request.style.whiteSpace).toBe('nowrap');
    expect(request.style.fontFamily).toBe('Courier New');
  });

  it('gras, italique (sujet 414) : `fontStyle` de l’éditeur', () => {
    expect(open({ ...BASE, bold: true }).style.fontStyle).toBe('1');
    expect(open({ ...BASE, bold: true, italic: true }).style.fontStyle).toBe('3');
    expect(open(BASE).style.fontStyle).toBe('0');
  });
});

describe('texte d’une forme tenu par une partie (sujet 414)', () => {
  it('`labelPart` : le double-clic sur la forme édite la partie', () => {
    const shape = { id: 's', kind: 'box' };
    const page = { id: 'p', shapes: [shape], edges: [] };
    const labelPart = vi.fn(() => 'name');
    const core = {
      targets: { editablePage: () => ({ page, pageTree: { cells: new Map([['s', { cell: {} }]]) } }) },
      shapeParts: { labelPart },
    } as unknown as EngineCore;
    const editor = new LabelEditor(core);
    const editPart = vi.spyOn(editor, 'editPartLabel').mockImplementation(() => undefined);
    editor.editLabel('s');
    expect(labelPart).toHaveBeenCalledWith(page, shape);
    expect(editPart).toHaveBeenCalledWith('s', 'name');
  });
});
