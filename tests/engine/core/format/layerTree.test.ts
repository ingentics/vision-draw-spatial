import { describe, expect, it } from 'vitest';
import { firstAncestor, isStructuralCell } from '../../../../src/engine/core/format/layerTree';

// Sujet 546 : règles des calques partagées par l'index des cellules et les écritures des calques.

describe('règles de l’arbre des calques', () => {
  it('racine ou calque : ni vertex ni arête', () => {
    expect(isStructuralCell({ vertex: false, edge: false })).toBe(true);
    expect(isStructuralCell({ vertex: true, edge: false })).toBe(false);
    expect(isStructuralCell({ vertex: false, edge: true })).toBe(false);
  });

  it('premier ancêtre qui répond, la cellule comprise ; rien au bout ni sur un cycle', () => {
    const parents: Record<string, string> = { c: 'b', b: 'a', x: 'y', y: 'x' };
    const parentOf = (id: string) => parents[id];
    expect(firstAncestor('c', parentOf, (id) => id === 'a')).toBe('a');
    expect(firstAncestor('c', parentOf, (id) => id === 'c')).toBe('c');
    expect(firstAncestor('c', parentOf, () => false)).toBeUndefined();
    expect(firstAncestor('x', parentOf, (id) => id === 'z')).toBeUndefined();
  });
});
