import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { PointerInput } from '../../../../../src/engine/core/domains/input/pointerInput';
import { takeoverCore } from '../takeoverCore';

describe('entrées capturées par le détenteur du verrou (sujet 467)', () => {
  it('clic : l’élément sous le pointeur est rendu, rien n’est sélectionné ; second clic d’un double-clic ignoré', () => {
    const { core } = takeoverCore({ picked: 'e' });
    const clicks: string[] = [];
    core.editLocks.lock({})!.captureInput({ click: (id) => clicks.push(id) });
    const pointer = new PointerInput(core);
    pointer.handleClick({ x: 0, y: 0 });
    pointer.handleClick({ x: 0, y: 0 }, false, false, true);
    expect(clicks).toEqual(['e']);
    expect(core.selection.selectItems).not.toHaveBeenCalled();
  });

  it('l’élément que vise la couche passe avant celui de la page', () => {
    const { core } = takeoverCore({ scene: true, picked: 'e' });
    const clicks: string[] = [];
    const owner = {};
    core.editLocks.lock(owner)!.captureInput({ click: (id) => clicks.push(id) });
    core.overlays.set(owner, {
      layer: () => ({ object: new Object3D(), hit: (point) => (point.x > 10 ? 'pastille' : undefined) }),
    });
    core.inputCaptures.click({ x: 20, y: 0 });
    core.inputCaptures.click({ x: 0, y: 0 });
    expect(clicks).toEqual(['pastille', 'e']);
  });

  it('survol : main seulement sur ce qui réagit ; retirée à la fin de la capture', () => {
    const { core } = takeoverCore({ picked: 'e' });
    const lock = core.editLocks.lock({})!;
    lock.captureInput({ clickable: (id) => id === 'e' });
    expect(core.inputCaptures.hover({ x: 0, y: 0 })).toBe(true);
    core.canvas.style.cursor = 'pointer';
    lock.release();
    expect(core.inputCaptures.active).toBe(false);
    expect(core.canvas.style.cursor).toBe('');
    expect(core.inputCaptures.click({ x: 0, y: 0 })).toBe(false);
  });

  it('touches : rendues au détenteur ; une erreur de sa part vaut « non prise », signalée', () => {
    const { core } = takeoverCore();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const lock = core.editLocks.lock({})!;
    lock.captureInput({
      key: (key) => {
        if (key === 'x') throw new Error('boum');
        return key === '1';
      },
    });
    expect(core.inputCaptures.key('1')).toBe(true);
    expect(core.inputCaptures.key('2')).toBe(false);
    expect(core.inputCaptures.key('x')).toBe(false);
    expect(core.pluginGuard.warnings()[0]?.message).toContain('entrées capturées, touche');
    lock.release();
    expect(core.inputCaptures.key('1')).toBe(false);
    error.mockRestore();
  });

  it('un verrou rendu ne capture plus rien', () => {
    const { core } = takeoverCore();
    const lock = core.editLocks.lock({})!;
    lock.release();
    lock.captureInput({ key: () => true });
    expect(core.inputCaptures.active).toBe(false);
  });
});
