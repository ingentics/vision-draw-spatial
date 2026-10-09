import { describe, expect, it } from 'vitest';
import { choiceDisplay, readFieldValue } from '../../../../src/engine/core/fields/fieldSchema';
import type { Field } from '../../../../src/engine/core/fields/fieldSchema';

const field = (declared: Field): Field => declared;

describe('lecture d’une valeur selon le champ (sujet 391)', () => {
  it('nombre : fini, ramené dans les bornes déclarées ; sans bornes, tel quel', () => {
    const bounded = field({ key: 'gap', label: 'Écart', type: 'number', min: 0, max: 80 });
    expect(readFieldValue(bounded, 500)).toBe(80);
    expect(readFieldValue(bounded, -3)).toBe(0);
    expect(readFieldValue(bounded, 12)).toBe(12);
    expect(readFieldValue(bounded, Number.NaN)).toBeUndefined();
    expect(readFieldValue(bounded, '12')).toBeUndefined();
    expect(readFieldValue(field({ key: 'n', label: 'N', type: 'number' }), -1e6)).toBe(-1e6);
    expect(readFieldValue(field({ key: 'n', label: 'N', type: 'number', min: 2 }), 1)).toBe(2);
  });

  it('bornes inversées : le maximum l’emporte', () => {
    expect(readFieldValue(field({ key: 'n', label: 'N', type: 'number', min: 10, max: 5 }), 7)).toBe(5);
  });

  it('case, texte, couleur : le bon type seulement', () => {
    expect(readFieldValue(field({ key: 't', label: 'T', type: 'toggle' }), false)).toBe(false);
    expect(readFieldValue(field({ key: 't', label: 'T', type: 'toggle' }), 'oui')).toBeUndefined();
    expect(readFieldValue(field({ key: 'x', label: 'X', type: 'text' }), 'mot')).toBe('mot');
    expect(readFieldValue(field({ key: 'x', label: 'X', type: 'text' }), 3)).toBeUndefined();
    expect(readFieldValue(field({ key: 'c', label: 'C', type: 'color' }), '#ABCDEF')).toBe('#ABCDEF');
    expect(readFieldValue(field({ key: 'c', label: 'C', type: 'color' }), 'rouge')).toBeUndefined();
  });

  it('choix : une valeur parmi les options', () => {
    const choice = field({
      key: 'r',
      label: 'Rendu',
      type: 'choice',
      options: [
        { value: 'kroki', label: 'kroki.io' },
        { value: 'local', label: 'Serveur local' },
      ],
    });
    expect(readFieldValue(choice, 'local')).toBe('local');
    expect(readFieldValue(choice, 'autre')).toBeUndefined();
  });

  it('adresse : http(s), espaces et barres finales retirés', () => {
    const url = field({ key: 'u', label: 'Serveur', type: 'url' });
    expect(readFieldValue(url, ' http://plantuml.lan:9000/ ')).toBe('http://plantuml.lan:9000');
    expect(readFieldValue(url, 'ftp://serveur')).toBeUndefined();
  });

  it('bouton : aucune valeur', () => {
    expect(readFieldValue(field({ key: 'b', label: 'Ajouter', type: 'button' }), 'x')).toBeUndefined();
  });
});

describe('présentation d’un choix (sujet 319)', () => {
  it('en boutons si toutes les options sont dessinées, sinon en liste', () => {
    expect(
      choiceDisplay([
        { value: 'a', label: 'A', color: '#ff0000' },
        { value: 'b', label: 'B', icon: {} },
      ]),
    ).toBe('buttons');
    expect(
      choiceDisplay([
        { value: 'a', label: 'A', color: '#ff0000' },
        { value: 'b', label: 'B' },
      ]),
    ).toBe('list');
    expect(choiceDisplay([])).toBe('list');
  });
});
