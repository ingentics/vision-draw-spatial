import { describe, expect, it, vi } from 'vitest';
import { PointerInput } from '../../../../../src/engine/core/domains/input/pointerInput';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';

/** Double-clic sur une forme, sur un cœur réduit à ce que `handleDoubleClick` lit. */
function doubleClick(parts: { part?: string; textPart?: string; text?: boolean }) {
  const shape = { id: 's', link: undefined };
  const selectItems = vi.fn();
  const editPartLabel = vi.fn();
  const editLabel = vi.fn();
  const core = {
    inputCaptures: { active: false },
    edgePoints: { doubleClickPointHandle: () => false },
    picking: { pickAt: () => ({ type: 'shape', element: shape }) },
    graph: { isGraphView: () => false },
    pages: { getCurrentPage: () => ({ id: 'p', shapes: [shape] }) },
    shapeParts: {
      partAt: () => parts.part,
      textPartAt: () => parts.textPart,
      text: () => (parts.text ? { text: '', zone: { x: 0, y: 0, width: 1, height: 1 }, fontSize: 7 } : undefined),
    },
    selection: { selectItems },
    labelEditor: { editPartLabel, editLabel },
  } as unknown as EngineCore;
  new PointerInput(core).handleDoubleClick({ x: 0, y: 0 }, false);
  return { selectItems, editPartLabel, editLabel };
}

describe('double-clic sur le texte d’une forme qui n’est pas une partie (sujet 269)', () => {
  it('texte de `textAt` : édité sur place, la forme sélectionnée seule (sans partie)', () => {
    const { selectItems, editPartLabel, editLabel } = doubleClick({ textPart: 'body', text: true });
    expect(editPartLabel).toHaveBeenCalledWith('s', 'body');
    expect(selectItems.mock.calls[0]).toHaveLength(1);
    expect(editLabel).not.toHaveBeenCalled();
  });

  it('sans texte à cet endroit : le label de la forme, comme avant', () => {
    expect(doubleClick({}).editLabel).toHaveBeenCalledWith('s');
    expect(doubleClick({ textPart: 'body', text: false }).editLabel).toHaveBeenCalledWith('s');
  });

  it('une partie sélectionnable passe avant', () => {
    const { selectItems, editPartLabel } = doubleClick({ part: '1', textPart: 'body', text: true });
    expect(selectItems.mock.calls[0]![1]).toBe('1');
    expect(editPartLabel).toHaveBeenCalledWith('s', '1');
  });
});

describe('double-clic hors de toute forme sur un texte du mode (sujet 514)', () => {
  /** Double-clic dans le vide ; `outside` : partie que le mode y désigne. */
  function emptyDoubleClick(outside: { shapeId: string; part: string } | undefined, text = true) {
    const selectItems = vi.fn();
    const editPartLabel = vi.fn();
    const editLabel = vi.fn();
    const core = {
      inputCaptures: { active: false },
      edgePoints: { doubleClickPointHandle: () => false },
      picking: { pickAt: () => undefined },
      graph: { isGraphView: () => false },
      pages: { getCurrentPage: () => ({ id: 'p', shapes: [] }) },
      shapeParts: {
        outsideTextAt: () => outside,
        text: () => (text ? { text: '', zone: { x: 0, y: 0, width: 1, height: 1 }, fontSize: 7 } : undefined),
      },
      selection: { selectItems },
      labelEditor: { editPartLabel, editLabel },
    } as unknown as EngineCore;
    new PointerInput(core).handleDoubleClick({ x: 0, y: 0 }, false);
    return { selectItems, editPartLabel, editLabel };
  }

  it('texte désigné par le mode : édité sur place, sans rien sélectionner', () => {
    const { selectItems, editPartLabel } = emptyDoubleClick({ shapeId: 's', part: 'group' });
    expect(editPartLabel).toHaveBeenCalledWith('s', 'group');
    expect(selectItems).not.toHaveBeenCalled();
  });

  it('rien sous le pointeur, ou partie sans texte : rien', () => {
    expect(emptyDoubleClick(undefined).editPartLabel).not.toHaveBeenCalled();
    expect(emptyDoubleClick({ shapeId: 's', part: 'group' }, false).editPartLabel).not.toHaveBeenCalled();
  });
});
