import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Registres injectables de bout en bout (sujet 290) : l'appli prend les registres du moteur affiché
 * (`PluginsContext`), jamais ceux par défaut ; seule exception, la reprise des anciens réglages
 * (`settingsStore.ts`), qui tourne avant la création du moteur.
 */
const APP = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/app');
const DEFAULTS =
  /(?<!\.)\b(defaultShapeRegistry|defaultModeRegistry|defaultEffectRegistry|SHAPE_TEMPLATES|usedTemplates)\b/;

function filesOf(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesOf(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('appli et registres du moteur (sujet 290)', () => {
  it('aucun registre ni modèle de palette par défaut dans l’appli, hors settingsStore', () => {
    const users = filesOf(APP)
      .filter((file) => DEFAULTS.test(readFileSync(file, 'utf8')))
      .map((file) => relative(APP, file));
    expect(users).toEqual(['settingsStore.ts']);
  });

  it('l’appli n’appelle pas les points d’entrée des réglages déclarés (sujet 294)', () => {
    const calls = filesOf(APP).filter((file) =>
      /property\.(hidden|value|readOnly|options)\??\.?\(/.test(readFileSync(file, 'utf8')),
    );
    expect(calls.map((file) => relative(APP, file))).toEqual([]);
  });

  it('l’appli ne demande pas au mode les effets permis (dette 296)', () => {
    const calls = filesOf(APP).filter((file) => /modes\.allowsEffect\(/.test(readFileSync(file, 'utf8')));
    expect(calls.map((file) => relative(APP, file))).toEqual([]);
  });
});
