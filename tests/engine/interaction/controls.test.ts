import { describe, expect, it } from 'vitest';
import {
  decelerate,
  DEFAULT_SHORTCUTS,
  keyDirection,
  releaseVelocity,
  resolveShortcut,
  wheelZoomFactor,
} from '../../../src/engine/interaction/controls';

describe('keyDirection', () => {
  it('lettres par position physique : Z Q S D (AZERTY) = W A S D (QWERTY)', () => {
    expect(keyDirection(['KeyW'], 'letters')).toEqual({ x: 0, y: -1 });
    expect(keyDirection(['KeyA'], 'letters')).toEqual({ x: -1, y: 0 });
    expect(keyDirection(['ArrowUp'], 'letters')).toEqual({ x: 0, y: 0 });
  });

  it('flèches, combinaison normalisée, touches opposées annulées', () => {
    const d = keyDirection(['ArrowUp', 'ArrowRight'], 'arrows');
    expect(d.x).toBeCloseTo(Math.SQRT1_2);
    expect(d.y).toBeCloseTo(-Math.SQRT1_2);
    expect(keyDirection(['KeyW', 'KeyS'], 'all')).toEqual({ x: 0, y: 0 });
  });

  it('« all » combine lettres et flèches', () => {
    expect(keyDirection(['KeyD'], 'all')).toEqual({ x: 1, y: 0 });
    expect(keyDirection(['ArrowDown'], 'all')).toEqual({ x: 0, y: 1 });
  });
});

describe('wheelZoomFactor', () => {
  it('molette vers soi (deltaY > 0) dézoome, vers l’avant zoome', () => {
    expect(wheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false }, 0.0015, 600)).toBeLessThan(1);
    expect(wheelZoomFactor({ deltaY: -100, deltaMode: 0, ctrlKey: false }, 0.0015, 600)).toBeGreaterThan(1);
  });

  it('un cran en lignes équivaut à 16 px ; le pincement trackpad est amplifié', () => {
    const pixels = wheelZoomFactor({ deltaY: 48, deltaMode: 0, ctrlKey: false }, 0.0015, 600);
    expect(wheelZoomFactor({ deltaY: 3, deltaMode: 1, ctrlKey: false }, 0.0015, 600)).toBeCloseTo(pixels);
    expect(wheelZoomFactor({ deltaY: 10, deltaMode: 0, ctrlKey: true }, 0.0015, 600)).toBeCloseTo(
      wheelZoomFactor({ deltaY: 100, deltaMode: 0, ctrlKey: false }, 0.0015, 600),
    );
  });
});

describe('glissade', () => {
  it('décélère exponentiellement puis s’arrête net sous un seuil', () => {
    const v = decelerate({ x: 600, y: 0 }, 0.08, 80);
    expect(v.x).toBeCloseTo(600 / Math.E);
    expect(decelerate({ x: 10, y: 0 }, 0.1, 80)).toEqual({ x: 0, y: 0 });
  });

  it('distance totale parcourue ≈ vitesse × constante de temps (glissade courte)', () => {
    let v = { x: 600, y: 0 };
    let travelled = 0;
    let t = 0;
    while (v.x !== 0) {
      travelled += v.x / 60;
      v = decelerate(v, 1 / 60, 80);
      t += 1 / 60;
    }
    expect(travelled).toBeGreaterThan(40);
    expect(travelled).toBeLessThan(60);
    expect(t).toBeLessThan(0.4);
  });

  it('désactivable (decelerationMs = 0)', () => {
    expect(decelerate({ x: 600, y: 0 }, 0.016, 0)).toEqual({ x: 0, y: 0 });
  });

  it('vitesse au relâchement : récente uniquement, bornée', () => {
    const samples = [
      { t: 0, p: { x: 0, y: 0 } },
      { t: 900, p: { x: 0, y: 0 } },
      { t: 950, p: { x: 25, y: 0 } },
      { t: 1000, p: { x: 50, y: 0 } },
    ];
    expect(releaseVelocity(samples, 1000)).toEqual({ x: 500, y: 0 });
    // Pointeur immobile avant de relâcher : pas de glissade.
    expect(releaseVelocity(samples, 1200)).toEqual({ x: 0, y: 0 });
    const fast = [
      { t: 0, p: { x: 0, y: 0 } },
      { t: 10, p: { x: 1000, y: 0 } },
    ];
    expect(releaseVelocity(fast, 10).x).toBe(3000);
  });
});

describe('raccourci « supprimer la sélection »', () => {
  it('Backspace supprime s’il y a une sélection, sinon c’est Retour', () => {
    expect(resolveShortcut('Backspace', DEFAULT_SHORTCUTS, { canDelete: true })).toBe('deleteSelection');
    expect(resolveShortcut('Backspace', DEFAULT_SHORTCUTS, { canDelete: false })).toBe('back');
  });

  it('touche paramétrable ; sans sélection, une touche dédiée ne fait rien', () => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, deleteSelection: 'x' };
    expect(resolveShortcut('X', shortcuts, { canDelete: true })).toBe('deleteSelection');
    expect(resolveShortcut('x', shortcuts, { canDelete: false })).toBeUndefined();
    expect(resolveShortcut('Backspace', shortcuts, { canDelete: true })).toBe('back');
  });
});
