import { describe, expect, it } from 'vitest';
import {
  decelerate,
  DEFAULT_SHORTCUTS,
  keyDirection,
  keyRotation,
  decelerateSpin,
  RESERVED_CODES,
  releaseVelocity,
  resolveShortcut,
  wheelZoomFactor,
} from '../../../../src/engine/core/interaction/controls';

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
    expect(releaseVelocity(fast, 10, { windowMs: 80, maxSpeed: 1000 }).x).toBe(1000);
    // Fenêtre plus large : l'immobilité du début compte, la vitesse moyenne baisse.
    expect(releaseVelocity(samples, 1000, { windowMs: 1000, maxSpeed: 3000 })).toEqual({ x: 50, y: 0 });
    // Seuil d'arrêt de la glissade réglable.
    expect(decelerate({ x: 10, y: 0 }, 0.001, 80, 20)).toEqual({ x: 0, y: 0 });
  });
});

describe('raccourci « supprimer la sélection »', () => {
  it('Backspace supprime s’il y a une sélection, sinon ne fait rien (plus de Retour, sujet 357)', () => {
    expect(resolveShortcut('Backspace', DEFAULT_SHORTCUTS, { canDelete: true })).toBe('deleteSelection');
    expect(resolveShortcut('Backspace', DEFAULT_SHORTCUTS, { canDelete: false })).toBeUndefined();
  });

  it('touche paramétrable ; sans sélection, une touche dédiée ne fait rien', () => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, deleteSelection: 'x' };
    expect(resolveShortcut('X', shortcuts, { canDelete: true })).toBe('deleteSelection');
    expect(resolveShortcut('x', shortcuts, { canDelete: false })).toBeUndefined();
    expect(resolveShortcut('Backspace', shortcuts, { canDelete: true })).toBeUndefined();
  });
});

describe('raccourci « éditer le commentaire » (étape 192)', () => {
  it('C par défaut, majuscule comprise', () => {
    expect(resolveShortcut('c', DEFAULT_SHORTCUTS, { canDelete: false })).toBe('editComment');
    expect(resolveShortcut('C', DEFAULT_SHORTCUTS, { canDelete: true })).toBe('editComment');
  });
});

describe('rotation au clavier (A / E, iso et 3D)', () => {
  it('par position physique : A (AZERTY) = Q (QWERTY) à gauche, E à droite, les deux s’annulent', () => {
    expect(keyRotation(['KeyQ'])).toBe(1);
    expect(keyRotation(['KeyE'])).toBe(-1);
    expect(keyRotation(['KeyQ', 'KeyE'])).toBe(0);
    expect(keyRotation(['KeyW'])).toBe(0);
  });

  it('glissade à l’arrêt, comme le déplacement ; arrêt net si désactivée', () => {
    expect(decelerateSpin(90, 0.08, 80)).toBeCloseTo(90 / Math.E);
    expect(decelerateSpin(2, 0.016, 80)).toBe(0);
    expect(decelerateSpin(90, 0.016, 0)).toBe(0);
  });

  it('touches réservées : pas attribuables à un raccourci', () => {
    expect(RESERVED_CODES).toEqual(expect.arrayContaining(['KeyQ', 'KeyE']));
  });
});
