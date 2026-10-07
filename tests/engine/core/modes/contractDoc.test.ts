import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Garanties des points d'entrée des modes (sujet 292) : chaque membre de `PageModeDefinition`, groupes dépliés (sujet
 * 295), a sa ligne dans la table de `docs/AJOUTER_UN_MODE.md` (section 8). Un point d'entrée ajouté sans garantie écrite fait échouer ce test.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const contract = readFileSync(resolve(ROOT, 'src/engine/core/modes/types.ts'), 'utf8');
const guide = readFileSync(resolve(ROOT, 'docs/AJOUTER_UN_MODE.md'), 'utf8');

/** Groupes du contrat (sujet 295), dépliés dans la table ; `current`, `parts`, `icon` y ont une ligne chacun. */
const GROUPS = ['ModePage', 'ModeLifecycle', 'ModeEdges', 'ModeGestures', 'ModeHandleSet'];

/** Corps (lignes) d'une interface du contrat. */
function bodyOf(name: string): string[] {
  const start = contract.indexOf(`export interface ${name} {`);
  return contract.slice(start, contract.indexOf('\n}\n', start)).split('\n').slice(1);
}

/**
 * Chemins des membres de `PageModeDefinition` (sujet 295) : un groupe (`page?: ModePage`, ou écrit en place comme
 * `palette?: { … }`) est remplacé par ses membres (`page.palette.shapes`).
 */
function members(name = 'PageModeDefinition', prefix = ''): string[] {
  const lines = bodyOf(name);
  const paths: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^ {2}(\w+)\??(?:[(:])\s*(.*)$/.exec(lines[i]!);
    if (!match) continue;
    const [, member, rest] = match as unknown as [string, string, string];
    const group = /^(Mode\w+);$/.exec(rest)?.[1];
    if (group && GROUPS.includes(group)) {
      paths.push(...members(group, `${prefix}${member}.`));
    } else if (rest === '{') {
      // Groupe écrit en place : ses membres, plus indentés, jusqu'à l'accolade fermante.
      for (i++; i < lines.length && !/^ {2}\};?$/.test(lines[i]!); i++) {
        const inner = /^ {4}(\w+)\??[(:]/.exec(lines[i]!);
        if (inner) paths.push(`${prefix}${member}.${inner[1]}`);
      }
    } else paths.push(`${prefix}${member}`);
  }
  return paths;
}

/** Points d'entrée qui ont une ligne dans la table des garanties. */
function documented(): string[] {
  const table = guide.slice(guide.indexOf('## 8. Garanties du moteur'));
  return [...table.matchAll(/^\| `([\w.]+)` \|/gm)].map((match) => match[1]!);
}

describe('garanties des points d’entrée des modes (sujet 292)', () => {
  it('chaque membre du contrat a sa ligne, et la table ne cite que des membres du contrat', () => {
    expect(members().length).toBeGreaterThan(30);
    expect([...documented()].sort()).toEqual([...members()].sort());
  });
});
