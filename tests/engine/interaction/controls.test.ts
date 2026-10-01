import { describe, expect, it } from 'vitest';
import { keyDirection, wheelZoomFactor } from '../../../src/engine/interaction/controls';

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
