import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Garanties des points d'entrée des modes (sujet 292) : chaque membre de `PageModeDefinition` a sa ligne dans la table
 * de `docs/AJOUTER_UN_MODE.md` (section 8). Un point d'entrée ajouté sans garantie écrite fait échouer ce test.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const contract = readFileSync(resolve(ROOT, 'src/engine/core/modes/types.ts'), 'utf8');
const guide = readFileSync(resolve(ROOT, 'docs/AJOUTER_UN_MODE.md'), 'utf8');

/** Membres de l'interface `PageModeDefinition`, lus dans sa déclaration. */
function members(): string[] {
  const start = contract.indexOf('export interface PageModeDefinition');
  const body = contract.slice(start, contract.indexOf('\n}\n', start));
  return [...body.matchAll(/^ {2}(\w+)\??[(:]/gm)].map((match) => match[1]!);
}

/** Points d'entrée qui ont une ligne dans la table des garanties. */
function documented(): string[] {
  const table = guide.slice(guide.indexOf('## 8. Garanties du moteur'));
  return [...table.matchAll(/^\| `(\w+)` \|/gm)].map((match) => match[1]!);
}

describe('garanties des points d’entrée des modes (sujet 292)', () => {
  it('chaque membre du contrat a sa ligne, et la table ne cite que des membres du contrat', () => {
    expect(members().length).toBeGreaterThan(30);
    expect([...documented()].sort()).toEqual([...members()].sort());
  });
});
