import { describe, expect, it } from 'vitest';
import { byReading } from '../../../../../src/engine/plugins/modes/eventstorming/readingOrder';

describe('ordre de lecture du mur (sujet 547)', () => {
  it('de haut en bas, puis de gauche à droite', () => {
    const at = (id: string, x: number, y: number) => ({ id, bounds: { x, y, width: 10, height: 10 } });
    const sorted = [at('c', 0, 20), at('b', 30, 0), at('a', 0, 0)].sort(byReading);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
