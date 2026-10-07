import { describe, expect, it } from 'vitest';
import { wholeTextChange } from '../../src/app/TextFormat';

describe('bascule de la mise en forme de tout le texte (sujet 313)', () => {
  it('ajoute ou retire le bit de la marque, et retire la clé à 0', () => {
    const toggle = (mark: 'bold' | 'italic' | 'underline' | 'strike', fontStyle?: string) =>
      wholeTextChange({ type: 'toggle', mark }, fontStyle === undefined ? {} : { fontStyle }).patch.fontStyle;
    expect(toggle('bold')).toBe('1');
    expect(toggle('strike', '3')).toBe('11');
    expect(toggle('italic', '3')).toBe('1');
    expect(toggle('underline', '4')).toBeUndefined();
  });
});
