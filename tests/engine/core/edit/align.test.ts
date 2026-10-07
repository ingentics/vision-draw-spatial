import { describe, expect, it } from 'vitest';
import { alignDeltas, distributeDeltas } from '../../../../src/engine/core/edit/align';
import type { AlignItem } from '../../../../src/engine/core/edit/align';

const box = (id: string, x: number, y: number, width = 40, height = 20): AlignItem => ({
  id,
  bounds: { x, y, width, height },
});

describe('alignDeltas (ticket 136)', () => {
  const a = box('a', 0, 0, 40, 20);
  const b = box('b', 100, 50, 60, 30);
  const c = box('c', 30, 200, 20, 10);

  it('aligne sur le dernier sélectionné, qui ne bouge pas', () => {
    const deltas = alignDeltas([a, b, c], 'left', 'last');
    expect(deltas.get('a')).toEqual({ x: 30, y: 0 });
    expect(deltas.get('b')).toEqual({ x: -70, y: 0 });
    expect(deltas.has('c')).toBe(false);
  });

  it('aligne sur le premier sélectionné', () => {
    const deltas = alignDeltas([a, b], 'right', 'first');
    expect(deltas.get('b')).toEqual({ x: -120, y: 0 });
    expect(deltas.has('a')).toBe(false);
  });

  it('centre et aligne sur le cadre de la sélection', () => {
    // Cadre : x 0 → 160, y 0 → 210.
    expect(alignDeltas([a, b, c], 'center', 'selection').get('a')).toEqual({ x: 60, y: 0 });
    expect(alignDeltas([a, b, c], 'bottom', 'selection').get('b')).toEqual({ x: 0, y: 130 });
    expect(alignDeltas([a, b, c], 'middle', 'selection').get('c')).toEqual({ x: 0, y: -100 });
  });

  it('place à côté de la référence, bord contre bord', () => {
    expect(alignDeltas([a, b], 'leftOf', 'last').get('a')).toEqual({ x: 60, y: 0 });
    expect(alignDeltas([a, b], 'rightOf', 'last').get('a')).toEqual({ x: 160, y: 0 });
    expect(alignDeltas([a, b], 'above', 'last').get('a')).toEqual({ x: 0, y: 30 });
    expect(alignDeltas([a, b], 'below', 'last').get('a')).toEqual({ x: 0, y: 80 });
  });

  it('ne fait rien sous deux formes', () => {
    expect(alignDeltas([a], 'left', 'selection').size).toBe(0);
  });
});

describe('distributeDeltas (ticket 136)', () => {
  it('répartit les bords gauches, les extrêmes restent en place', () => {
    const deltas = distributeDeltas([box('a', 0, 0), box('c', 100, 0), box('b', 20, 0)], 'left');
    expect(deltas.get('b')).toEqual({ x: 30, y: 0 });
    expect(deltas.has('a')).toBe(false);
    expect(deltas.has('c')).toBe(false);
  });

  it('répartit les centres et les bords de fin', () => {
    const items = [box('a', 0, 0, 20), box('b', 10, 0, 60), box('c', 200, 0, 20)];
    // Centres 10 et 210 : celui du milieu à 110.
    expect(distributeDeltas(items, 'center').get('b')).toEqual({ x: 70, y: 0 });
    // Bords droits 20 et 220 : celui du milieu à 120.
    expect(distributeDeltas(items, 'right').get('b')).toEqual({ x: 50, y: 0 });
  });

  it('donne des espaces égaux entre formes voisines', () => {
    const items = [box('a', 0, 0, 20), box('b', 30, 0, 40), box('c', 160, 0, 20)];
    // Libre entre 20 et 160 : 140 - 40 = 100, soit deux espaces de 50.
    expect(distributeDeltas(items, 'spacingX').get('b')).toEqual({ x: 40, y: 0 });
  });

  it('répartit en hauteur', () => {
    const items = [box('a', 0, 0, 20, 10), box('b', 0, 5, 20, 10), box('c', 0, 100, 20, 10)];
    expect(distributeDeltas(items, 'top').get('b')).toEqual({ x: 0, y: 45 });
    expect(distributeDeltas(items, 'spacingY').get('b')).toEqual({ x: 0, y: 45 });
  });

  it('ne fait rien sous trois formes', () => {
    expect(distributeDeltas([box('a', 0, 0), box('b', 50, 0)], 'left').size).toBe(0);
  });
});
