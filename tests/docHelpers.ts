import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Lecture des docs et des contrats pour les tests des docs (sujet 390). */

/** Racine du dépôt. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Contenu d'un fichier du dépôt (chemin depuis la racine). */
export function readRepo(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

/** Membres de premier niveau d'une interface exportée de `source` (`  nom?:` ou `  nom(`). */
export function interfaceMembers(source: string, name: string): string[] {
  const start = source.indexOf(`export interface ${name} {`);
  if (start < 0) throw new Error(`Interface ${name} introuvable`);
  const body = source.slice(start, source.indexOf('\n}\n', start)).split('\n').slice(1);
  return body.flatMap((line) => {
    const member = /^ {2}(\w+)\??[(:]/.exec(line)?.[1];
    return member ? [member] : [];
  });
}

/**
 * Première colonne d'un tableau d'un guide, repéré par le début de sa ligne d'en-tête : le nom entre backticks, sans
 * ses paramètres (`` `outline(shape, ctx)` `` → `outline`).
 */
export function tableKeys(guide: string, header: string): string[] {
  const start = guide.indexOf(`\n${header}`);
  if (start < 0) throw new Error(`Tableau « ${header} » introuvable`);
  const end = guide.indexOf('\n\n', start + 1);
  const rows = guide.slice(start + 1, end < 0 ? undefined : end).split('\n');
  return rows.flatMap((row) => {
    const key = /^\| `(\w+)/.exec(row)?.[1];
    return key ? [key] : [];
  });
}

/** Contenus entre backticks d'un texte Markdown. */
export function backticked(markdown: string): string[] {
  return [...markdown.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]!);
}
