import { describe, expect, it } from 'vitest';
import { marqueeTakes, rectBetween } from '../../../src/engine/interaction/marquee';
import type { Footprint } from '../../../src/engine/interaction/marquee';

const box = (x: number, y: number, w: number, h: number): Footprint => ({
  points: [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ],
  closed: true,
});

describe('rectBetween', () => {
  it('normalise le sens du glisser', () => {
    expect(rectBetween({ x: 50, y: 80 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, width: 40, height: 60 });
  });
});

describe('marqueeTakes', () => {
  const rect = { x: 0, y: 0, width: 100, height: 100 };

  it('inclus : la forme entière dans le rectangle', () => {
    expect(marqueeTakes(box(10, 10, 50, 50), rect, false)).toBe(true);
    expect(marqueeTakes(box(80, 10, 50, 50), rect, false)).toBe(false);
  });

  it('contact (Alt) : il suffit de toucher, même par un bord', () => {
    expect(marqueeTakes(box(80, 10, 50, 50), rect, true)).toBe(true);
    // Forme qui traverse le rectangle sans qu'aucun de ses coins y soit.
    expect(marqueeTakes(box(-20, 40, 200, 10), rect, true)).toBe(true);
    // Rectangle tiré à l'intérieur d'une grande forme.
    expect(marqueeTakes(box(-50, -50, 300, 300), rect, true)).toBe(true);
    expect(marqueeTakes(box(150, 150, 20, 20), rect, true)).toBe(false);
  });

  it('volume iso : enveloppe de la base et du dessus, points dans le désordre', () => {
    const volume: Footprint = {
      points: [
        { x: 120, y: 50 },
        { x: 160, y: 70 },
        { x: 120, y: 90 },
        { x: 80, y: 70 },
        { x: 120, y: 20 },
        { x: 160, y: 40 },
        { x: 120, y: 60 },
        { x: 80, y: 40 },
      ],
      closed: true,
    };
    expect(marqueeTakes(volume, rect, false)).toBe(false);
    expect(marqueeTakes(volume, rect, true)).toBe(true);
    expect(marqueeTakes(volume, { x: 70, y: 10, width: 100, height: 90 }, false)).toBe(true);
  });

  it('flèche : tracé ouvert, pris s’il est inclus ou traversé (contact)', () => {
    const edge: Footprint = {
      points: [
        { x: -50, y: 50 },
        { x: 150, y: 50 },
      ],
      closed: false,
    };
    expect(marqueeTakes(edge, rect, false)).toBe(false);
    expect(marqueeTakes(edge, rect, true)).toBe(true);
    // Un coude en L qui contourne le rectangle ne le touche pas (pas d'intérieur pour une flèche).
    const around: Footprint = {
      points: [
        { x: -10, y: -10 },
        { x: 110, y: -10 },
        { x: 110, y: 110 },
      ],
      closed: false,
    };
    expect(marqueeTakes(around, rect, true)).toBe(false);
    expect(
      marqueeTakes(
        {
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 90 },
          ],
          closed: false,
        },
        rect,
        false,
      ),
    ).toBe(true);
  });
});
