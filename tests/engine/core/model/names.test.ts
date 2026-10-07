import { describe, expect, it } from 'vitest';
import { elementName, firstFreeName } from '../../../../src/engine/core/model/names';

describe('premier nom numéroté libre (sujet 307)', () => {
  it('plus petit numéro libre à partir de `start`', () => {
    expect(firstFreeName('f', [])).toBe('f1');
    expect(firstFreeName('f', ['f1', 'f3'])).toBe('f2');
    expect(firstFreeName('Page-', ['Page-1', 'Page-3'], 3)).toBe('Page-4');
    expect(firstFreeName('Field', new Set(['Field1', 'Field2']))).toBe('Field3');
  });
});

describe('nom d’un élément (sujet 325)', () => {
  it('le label, sinon l’id', () => {
    expect(elementName({ id: 'a', label: 'Client' })).toBe('Client');
    expect(elementName({ id: 'a', label: '' })).toBe('a');
  });
});
