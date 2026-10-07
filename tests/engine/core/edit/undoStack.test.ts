import { describe, expect, it } from 'vitest';
import { UndoStack } from '../../../../src/engine/core/edit/undoStack';

describe('UndoStack', () => {
  it('annule puis rétablit dans l’ordre, avec les libellés', () => {
    const stack = new UndoStack<string>();
    stack.record('A', 's0');
    stack.record('B', 's1');
    expect(stack.undoLabel()).toBe('B');
    expect(stack.undo('s2')).toBe('s1');
    expect(stack.redoLabel()).toBe('B');
    expect(stack.undo('s1')).toBe('s0');
    expect(stack.undo('s0')).toBeUndefined();
    expect(stack.redo('s0')).toBe('s1');
    expect(stack.redo('s1')).toBe('s2');
  });

  it('une nouvelle modification efface ce qui pouvait être rétabli', () => {
    const stack = new UndoStack<string>();
    stack.record('A', 's0');
    stack.undo('s1');
    stack.record('C', 's0');
    expect(stack.redoLabel()).toBeUndefined();
  });

  it('« modifié » suit la position de la dernière sauvegarde', () => {
    const stack = new UndoStack<string>();
    expect(stack.isModified()).toBe(false);
    stack.record('A', 's0');
    expect(stack.isModified()).toBe(true);
    stack.markSaved();
    stack.record('B', 's1');
    stack.undo('s2');
    expect(stack.isModified()).toBe(false);
    stack.undo('s1');
    expect(stack.isModified()).toBe(true);
    // Sauvegarde devenue inatteignable : toujours modifié.
    stack.record('C', 's0');
    expect(stack.isModified()).toBe(true);
  });

  it('pile bornée', () => {
    const stack = new UndoStack<number>(2);
    for (let i = 0; i < 5; i++) stack.record(String(i), i);
    expect(stack.undo(5)).toBe(4);
    expect(stack.undo(4)).toBe(3);
    expect(stack.undo(3)).toBeUndefined();
  });

  it('taille de pile réglable : les plus anciennes étapes en trop sont oubliées', () => {
    const stack = new UndoStack<number>(10);
    for (let i = 0; i < 5; i++) stack.record(`m${i}`, i);
    stack.setLimit(2);
    expect(stack.undo(5)).toBe(4);
    expect(stack.undo(4)).toBe(3);
    expect(stack.undo(3)).toBeUndefined();
  });
});
