import { describe, expect, it } from 'vitest';
import { decodeEntities, emptyIfBlank, resolvePlaceholders } from '../../../../src/engine/core/format/labelText';

describe('emptyIfBlank', () => {
  it('texte de blancs et de lignes vides : vide ; sinon gardé tel quel, lignes vides comprises', () => {
    expect(emptyIfBlank(' \n\n ')).toBe('');
    expect(emptyIfBlank('\na\n\nb\n')).toBe('\na\n\nb\n');
  });
});

describe('decodeEntities', () => {
  it('laisse les entités inconnues intactes', () => {
    expect(decodeEntities('&foo; &#xZZ;')).toBe('&foo; &#xZZ;');
  });
});

describe('resolvePlaceholders', () => {
  it('remplace les attributs connus, %% → %, inconnus laissés tels quels', () => {
    expect(resolvePlaceholders('%name% v%version% (100%%) %nope%', { name: 'Docs', version: '2' })).toBe(
      'Docs v2 (100%) %nope%',
    );
  });
});
