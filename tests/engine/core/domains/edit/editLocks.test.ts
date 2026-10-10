import { describe, expect, it, vi } from 'vitest';
import { Pages } from '../../../../../src/engine/core/domains/document/pages';
import { takeoverCore } from '../takeoverCore';

describe('verrou d’édition d’un mode (sujet 467)', () => {
  it('pris : sélection vidée, signalé ; refusé à un second détenteur ; rendu : signalé, détenteur prévenu', () => {
    const { core, events } = takeoverCore();
    const owner = {};
    const released = vi.fn();
    const lock = core.editLocks.lock(owner, released)!;
    expect(lock.pageId).toBe('p');
    expect(core.selection.clearSelection).toHaveBeenCalled();
    expect(core.editLocks.owner).toBe(owner);
    expect(core.editLocks.lock({})).toBeUndefined();
    lock.release();
    lock.release();
    expect(core.editLocks.owner).toBeUndefined();
    expect(released).toHaveBeenCalledTimes(1);
    expect(events.filter(([name]) => name === 'editLockChange')).toEqual([
      ['editLockChange', owner],
      ['editLockChange', undefined],
    ]);
  });

  it('rendu au changement de page, de document et à l’arrêt du moteur', () => {
    const { core } = takeoverCore();
    const released = vi.fn();
    core.editLocks.lock({}, released);
    core.editLocks.pageShown('p');
    expect(core.editLocks.owner).toBeDefined();
    core.editLocks.pageShown('autre');
    expect(core.editLocks.owner).toBeUndefined();
    core.editLocks.lock({}, released);
    core.editLocks.resetDocument();
    core.editLocks.lock({}, released);
    core.editLocks.dispose();
    expect(core.editLocks.owner).toBeUndefined();
    expect(released).toHaveBeenCalledTimes(3);
  });

  it('un détenteur qui lève en étant prévenu rend tout de même le verrou (erreur signalée)', () => {
    const { core } = takeoverCore();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    core.editLocks.lock({}, () => {
      throw new Error('boum');
    });
    core.editLocks.pageShown('autre');
    expect(core.editLocks.owner).toBeUndefined();
    expect(core.pluginGuard.warnings()[0]?.message).toContain('Mode essai');
    error.mockRestore();
  });

  it('édition refusée : formes et flèches, pages, annuler et rétablir ; libellés d’annulation retirés', () => {
    const { core, events } = takeoverCore();
    core.edits.recordEdit('Avant');
    expect(core.targets.editablePage()).toBeDefined();
    expect(core.edits.canUndo()).toBe(true);
    const lock = core.editLocks.lock({})!;
    expect(core.targets.canEditNow()).toBe(false);
    expect(core.targets.editablePage()).toBeUndefined();
    expect(core.targets.writablePage()).toBeUndefined();
    expect(core.targets.editablePageById('p')).toBeUndefined();
    expect(core.edits.canUndo()).toBe(false);
    core.edits.undo();
    expect(core.file.restore).not.toHaveBeenCalled();
    expect(events.filter(([name]) => name === 'undoChange').at(-1)).toEqual(['undoChange', undefined, undefined]);
    const record = vi.spyOn(core.edits, 'recordEdit');
    const pages = new Pages(core);
    // Pages modifiables en elles-mêmes : seul le verrou les refuse.
    expect(pages.canEditPages()).toBe(true);
    expect(pages.addPage('Nouvelle')).toBeUndefined();
    pages.renamePage('p', 'Autre nom');
    pages.removePage('p');
    expect(record).not.toHaveBeenCalled();
    lock.release();
    expect(core.targets.editablePage()).toBeDefined();
    expect(events.filter(([name]) => name === 'undoChange').at(-1)).toEqual(['undoChange', 'Avant', undefined]);
  });
});
