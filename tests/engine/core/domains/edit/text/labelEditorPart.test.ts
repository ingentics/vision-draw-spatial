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
    picking: { screenRectOf: () => ({ x: 0, y: 0, width: 100, height: 50 }) },
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
});
