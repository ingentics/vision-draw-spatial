import { describe, expect, it } from 'vitest';
import { nearestOnScreen } from '../../../../../src/engine/core/domains/selection/picking';

describe('élément le plus proche à l’écran (sujet 381)', () => {
  const items = [
    { id: 'a', at: { x: 0, y: 0 } },
    { id: 'b', at: { x: 6, y: 0 } },
    { id: 'c', at: { x: 10, y: 0 } },
  ];
  const at = (item: (typeof items)[number]) => item.at;

  it('le plus proche dans la tolérance, pas le premier', () => {
    expect(nearestOnScreen(items, at, { x: 9, y: 0 }, 8)?.id).toBe('c');
    expect(nearestOnScreen(items, at, { x: 2, y: 0 }, 8)?.id).toBe('a');
  });

  it('hors tolérance : rien ; distance égale à la tolérance : pris', () => {
    expect(nearestOnScreen(items, at, { x: 30, y: 0 }, 8)).toBeUndefined();
    expect(nearestOnScreen(items, at, { x: 18, y: 0 }, 8)?.id).toBe('c');
    expect(nearestOnScreen([], at, { x: 0, y: 0 }, 8)).toBeUndefined();
  });

  it('à distance égale le premier ; le biais départage et compte dans la tolérance', () => {
    expect(nearestOnScreen(items, at, { x: 3, y: 0 }, 8)?.id).toBe('a');
    const bias = (item: (typeof items)[number]) => (item.id === 'a' ? 0.5 : 0);
    expect(nearestOnScreen(items, at, { x: 3, y: 0 }, 8, bias)?.id).toBe('b');
    expect(nearestOnScreen(items, at, { x: -8, y: 0 }, 8, bias)).toBeUndefined();
  });
});
