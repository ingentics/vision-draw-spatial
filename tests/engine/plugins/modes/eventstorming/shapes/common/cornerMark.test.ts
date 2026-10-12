import { describe, expect, it } from 'vitest';
import { cornerMarkRect } from '../../../../../../../src/engine/plugins/modes/eventstorming/shapes/common/cornerMark';

describe('marques en coin d’un post-it (sujet 547)', () => {
  it('carré de 20 en retrait de 7 du haut et du bord gauche ou droit', () => {
    const bounds = { x: 100, y: 50, width: 120, height: 80 };
    expect(cornerMarkRect(bounds, 'left')).toEqual({ x: 107, y: 57, width: 20, height: 20 });
    expect(cornerMarkRect(bounds, 'right')).toEqual({ x: 193, y: 57, width: 20, height: 20 });
  });
});
