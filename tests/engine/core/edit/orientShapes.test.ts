import { describe, expect, it } from 'vitest';
import { orientChange } from '../../../../src/engine/core/edit/orientShapes';
import type { OrientAction } from '../../../../src/engine/core/edit/orientShapes';
import { orientation } from '../../../../src/engine/core/render/geometry/orient';

/** Style après l'action (clés d'orientation seules). */
function apply(style: Record<string, string>, action: OrientAction): Record<string, string> {
  const change = orientChange(style, action)!;
  const next = { ...style };
  for (const [key, value] of Object.entries(change.style)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}

/** Image à l'écran du coin haut gauche d'un cadre local de 40 × 20, pour comparer deux orientations. */
const corner = (style: Record<string, string>) => {
  const o = orientation({ x: 0, y: 0, width: 40, height: 20 }, style);
  const p = o.direction({ x: -20, y: -10 });
  return `${p.x},${p.y}`;
};

describe('retourner et pivoter une forme (sujet 335)', () => {
  it('un retournement horizontal écrit flipH, un second le retire', () => {
    const once = apply({}, 'flipHorizontal');
    expect(once).toEqual({ flipH: '1' });
    expect(apply(once, 'flipHorizontal')).toEqual({});
  });

  it('un retournement vertical écrit flipV, un second le retire', () => {
    const once = apply({}, 'flipVertical');
    expect(once).toEqual({ flipV: '1' });
    expect(apply(once, 'flipVertical')).toEqual({});
  });

  it('le retournement ne change pas la taille', () => {
    expect(orientChange({}, 'flipHorizontal')!.swapSize).toBe(false);
  });

  it('pivoter à droite suit east → south → west → north → east, et échange la taille', () => {
    let style: Record<string, string> = {};
    const seen: Array<string | undefined> = [];
    for (let i = 0; i < 4; i++) {
      expect(orientChange(style, 'rotateRight')!.swapSize).toBe(true);
      style = apply(style, 'rotateRight');
      seen.push(style.direction);
    }
    expect(seen).toEqual(['south', 'west', 'north', undefined]);
    expect(style).toEqual({});
  });

  it('pivoter à gauche suit le cycle inverse', () => {
    let style: Record<string, string> = {};
    const seen: Array<string | undefined> = [];
    for (let i = 0; i < 4; i++) {
      style = apply(style, 'rotateLeft');
      seen.push(style.direction);
    }
    expect(seen).toEqual(['north', 'west', 'south', undefined]);
  });

  it('à droite puis à gauche revient à l’état d’origine, avec ou sans retournement', () => {
    const starts: Array<Record<string, string>> = [
      {},
      { flipH: '1' },
      { flipV: '1' },
      { direction: 'north', flipH: '1' },
      { direction: 'west' },
    ];
    for (const start of starts) {
      const back = apply(apply(start, 'rotateRight'), 'rotateLeft');
      expect(corner(back)).toBe(corner(start));
    }
  });

  it('le retournement agit sur l’écran, même sur une forme déjà pivotée', () => {
    const image = (style: Record<string, string>) => {
      const o = orientation({ x: 0, y: 0, width: 40, height: 20 }, style);
      const x = o.direction({ x: 1, y: 0 });
      const y = o.direction({ x: 0, y: 1 });
      return [x.x, x.y, y.x, y.y].map((value) => Math.round(value) + 0);
    };
    for (const direction of ['east', 'south', 'west', 'north']) {
      const style = { direction };
      const [a, b, c, d] = image(style) as [number, number, number, number];
      // Miroir gauche ↔ droite : l'abscisse de chaque image change de signe ; haut ↔ bas : l'ordonnée.
      expect(image(apply(style, 'flipHorizontal'))).toEqual([-a + 0, b, -c + 0, d]);
      expect(image(apply(style, 'flipVertical'))).toEqual([a, -b + 0, c, -d + 0]);
    }
  });

  it('deux retournements ne se confondent pas avec une rotation de 180° mais en ont le dessin', () => {
    const both = apply(apply({}, 'flipHorizontal'), 'flipVertical');
    expect(both).toEqual({ flipH: '1', flipV: '1' });
  });
});
