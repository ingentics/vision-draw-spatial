import { describe, expect, it } from 'vitest';
import { modeKeys } from '../../../../src/engine/core/modes/modeKeys';
import { modeText } from '../../../../src/engine/core/modes/modeText';

const text = modeText(modeKeys({ namespace: 'ns' }), 'body');
const shape = (style: Record<string, string>) => ({ style, attributes: {} });

describe('texte libre d’une forme dans une clé de mode (sujet 448)', () => {
  it('écrit en chaîne JSON aux « ; » échappés, relu tel quel', () => {
    const value = text.value('a; b\r\nc\td')!;
    expect(value).not.toContain(';');
    expect(text.read(shape({ 'spatial.ns.body': value }))).toBe('a; b\nc  d');
  });

  it('vide ou blanc : clé retirée ; absente : texte vide ; valeur qui n’est pas du JSON : lue telle quelle', () => {
    expect(text.value('')).toBeUndefined();
    expect(text.value(' \n ')).toBeUndefined();
    expect(text.read(shape({}))).toBe('');
    expect(text.read(shape({ 'spatial.ns.body': 'brut' }))).toBe('brut');
  });

  it('aperçu : la forme porte le texte saisi dans son style, ou ne l’a plus s’il est vide', () => {
    const before = shape({ 'spatial.ns.body': '"x"', fillColor: '#fff' });
    expect(text.read(text.preview(before, 'y'))).toBe('y');
    expect(text.preview(before, '').style).toEqual({ fillColor: '#fff' });
    expect(before.style['spatial.ns.body']).toBe('"x"');
  });
});
