import { describe, expect, it } from 'vitest';
import { yamlProblem } from '../../../../src/engine/core/diagnostics/yamlCheck';

describe('contrôle d’un texte YAML (sujet 269)', () => {
  it('YAML valide ou vide : aucun problème', () => {
    expect(yamlProblem('')).toBeUndefined();
    expect(yamlProblem('theme:\nlocale: fr\nlist:\n  - a\n  - b')).toBeUndefined();
  });

  it('YAML invalide : première erreur, avec sa ligne et sa colonne, sans l’extrait du parseur', () => {
    expect(yamlProblem('a:\n\tb: 1')).toBe('ligne 2, colonne 1 : Tabs are not allowed as indentation');
    expect(yamlProblem('a: 1\na: 2')).toBe('ligne 2, colonne 1 : Map keys must be unique');
    expect(yamlProblem('a: [1, 2')).toMatch(/^ligne 1, colonne \d+ : /);
  });
});
